import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { Model, Types } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { Product } from "../schemasMongo/product.schema";
import { StockMovement, StockMovementDocument } from "../schemasMongo/stock-movement.schema";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { OpenFoodFactsService } from "./open-food-facts.service";

@Injectable()
export class ProductService {
    constructor(
        @InjectModel(Product.name) private productModel: Model<Product>,
        @InjectModel(StockMovement.name) private stockMovementModel: Model<StockMovementDocument>,
        private readonly openFoodFactsService: OpenFoodFactsService,
    ) { }

    async getAllProducts() {
        return await this.productModel.find({}).sort({ updatedAt: -1 });
    }

    async getProductById(id: string | number) {
        const query = Types.ObjectId.isValid(String(id))
            ? { _id: new Types.ObjectId(String(id)) }
            : { $or: [{ id }, { barCode: String(id) }] };

        const product = await this.productModel.findOne(query);
        if (!product) throw new NotFoundException("Producto no encontrado");
        return product;
    }

    async addProduct(productDto: CreateProductDto) {
        // Validación de código de barras único para evitar duplicados en concurrencia
        if (productDto.barCode) {
            const rawCode = String(productDto.barCode).trim();
            const existing = await this.productModel.findOne({
                $or: [{ barCode: rawCode }, { barCode: Number(rawCode) || -1 }],
            });
            if (existing) {
                throw new ConflictException(`Ya existe un producto con el código de barras "${rawCode}" (${existing.name})`);
            }
        }

        const payload = {
            ...productDto,
            barCode: productDto.barCode ? String(productDto.barCode).trim() : undefined,
            stock: Number(productDto.stock) || 0,
            price: Number(productDto.price) || 0,
            quantity: Number(productDto.quantity) || 1,
        };

        const createdProduct = new this.productModel(payload);
        const saved = await createdProduct.save();

        // Registrar movimiento inicial de stock si es > 0
        if (saved.stock > 0) {
            await this.stockMovementModel.create({
                product: saved._id,
                type: 'entry',
                quantity: saved.stock,
                previousStock: 0,
                newStock: saved.stock,
                reason: 'Alta inicial de producto en inventario',
                reference: saved.barCode || 'ALTA-INICIAL',
                user: 'administrador',
            });
        }

        return saved;
    }

    async updateProduct(id: string | number, productDto: UpdateProductDto) {
        const query = Types.ObjectId.isValid(String(id))
            ? { _id: new Types.ObjectId(String(id)) }
            : { $or: [{ id }, { barCode: String(id) }] };

        const current = await this.productModel.findOne(query);
        if (!current) throw new NotFoundException("Producto no encontrado");

        // Si cambia el stock, auditar movimiento
        if (productDto.stock !== undefined && Number(productDto.stock) !== current.stock) {
            const newStockVal = Math.max(0, Number(productDto.stock));
            const delta = newStockVal - current.stock;
            await this.stockMovementModel.create({
                product: current._id,
                type: delta > 0 ? 'entry' : 'adjustment',
                quantity: delta,
                previousStock: current.stock,
                newStock: newStockVal,
                reason: 'Ajuste manual de inventario',
                reference: 'AJUSTE-MANUAL',
                user: 'gerente',
            });
            current.stock = newStockVal;
        }

        if (productDto.name !== undefined) current.name = productDto.name;
        if (productDto.brand !== undefined) current.brand = productDto.brand;
        if (productDto.price !== undefined) current.price = Number(productDto.price);
        if (productDto.quantity !== undefined) current.quantity = Number(productDto.quantity);
        if (productDto.unitMesure !== undefined) current.unitMesure = productDto.unitMesure;
        if (productDto.category !== undefined) current.category = productDto.category;
        if (productDto.description !== undefined) current.description = productDto.description;
        if (productDto.imageUrl !== undefined) current.imageUrl = productDto.imageUrl;
        if (productDto.barCode !== undefined) current.barCode = String(productDto.barCode).trim();
        if (productDto.servingSize !== undefined) current.servingSize = productDto.servingSize;
        if (productDto.nutriments !== undefined) current.nutriments = productDto.nutriments;

        return await current.save();
    }

    async deleteProductById(id: string | number) {
        const query = Types.ObjectId.isValid(String(id))
            ? { _id: new Types.ObjectId(String(id)) }
            : { $or: [{ id }, { barCode: String(id) }] };

        const deletedProduct = await this.productModel.findOneAndDelete(query);
        if (!deletedProduct) throw new NotFoundException("Producto no encontrado");

        return deletedProduct;
    }

    // Lookup por código de barras (local + Open Food Facts fallback)
    async lookupBarcode(rawBarcode: string) {
        const code = String(rawBarcode || '').trim();
        if (!code) {
            throw new BadRequestException("Debe proporcionar un código de barras válido");
        }

        // 1. Buscar en el catálogo local de la base de datos
        const local = await this.productModel.findOne({
            $or: [{ barCode: code }, { barCode: Number(code) || -1 }],
        });

        if (local) {
            return {
                found: true,
                source: 'local',
                code,
                product: {
                    id: (local as any)._id.toString(),
                    name: local.name,
                    brand: local.brand,
                    price: local.price,
                    quantity: local.quantity,
                    unitMesure: local.unitMesure,
                    category: local.category,
                    description: local.description,
                    stock: local.stock,
                    barCode: local.barCode,
                    imageUrl: local.imageUrl,
                    nutriments: local.nutriments,
                    servingSize: local.servingSize,
                    updatedAt: (local as any).updatedAt,
                },
                message: 'Producto encontrado en el catálogo local del restaurante.',
            };
        }

        // 2. Si no existe localmente, consultar Open Food Facts
        const offResult = await this.openFoodFactsService.lookupByBarcode(code);
        return offResult;
    }

    // Registrar recepción / entrada de mercancía auditada
    async registerStockEntry(
        id: string,
        quantity: number,
        notes?: string,
        reference?: string,
        user?: string,
    ) {
        if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new BadRequestException("La cantidad recibida debe ser un número positivo");
        }

        const query = Types.ObjectId.isValid(String(id))
            ? { _id: new Types.ObjectId(String(id)) }
            : { $or: [{ id }, { barCode: String(id) }] };

        const product = await this.productModel.findOne(query);
        if (!product) throw new NotFoundException("Producto no encontrado en inventario");

        const previousStock = product.stock;
        const newStock = previousStock + quantity;
        product.stock = newStock;
        const saved = await product.save();

        const movement = await this.stockMovementModel.create({
            product: saved._id,
            type: 'entry',
            quantity,
            previousStock,
            newStock,
            reason: notes || 'Recepción de mercancía / Entrada de stock',
            reference: reference || 'RECEPCION-MERCANCIA',
            user: user || 'gerente',
        });

        return {
            success: true,
            product: saved,
            movement,
            message: `Se agregaron ${quantity} ${product.unitMesure || 'unidades'} a "${product.name}". Stock actual: ${newStock}`,
        };
    }

    // Consultar historial de movimientos auditables
    async getStockMovements(productId?: string) {
        const query: any = {};
        if (productId && Types.ObjectId.isValid(productId)) {
            query.product = new Types.ObjectId(productId);
        }
        return await this.stockMovementModel
            .find(query)
            .populate('product', 'name barCode unitMesure')
            .sort({ createdAt: -1 })
            .limit(100);
    }
}