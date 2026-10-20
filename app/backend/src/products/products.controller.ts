import {
    Controller,
    Delete,
    Get,
    Patch,
    Post,
    Put,
    Body,
    Query,
    Param,
    UseGuards,
} from "@nestjs/common";
import { ProductService } from "./products.service";
import { UpdateProductDto } from "./dto/update-product.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("/products")
export class ProductController {
    constructor(private readonly productService: ProductService) {}

    @Get("/")
    async getAllProducts() {
        return await this.productService.getAllProducts();
    }

    // Lookup por código de barras (POST o GET)
    @Post("/barcode/lookup")
    async lookupBarcodePost(@Body() body: Record<string, any>) {
        const barcode = body?.barcode || body?.barCode || body?.code;
        return await this.productService.lookupBarcode(barcode);
    }

    @Get("/barcode/:code")
    async lookupBarcodeGet(@Param("code") code: string) {
        return await this.productService.lookupBarcode(code);
    }

    // Historial de movimientos de stock
    @Get("/movements/all")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('owner', 'manager')
    async getMovements(@Query("productId") productId?: string) {
        return await this.productService.getStockMovements(productId);
    }

    // Entrada / Recepción de mercancía auditada
    @Post("/:id/stock-entry")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('owner', 'manager')
    async registerStockEntry(
        @Param("id") id: string,
        @Body() body: { quantity: number; notes?: string; reference?: string; user?: string }
    ) {
        return await this.productService.registerStockEntry(
            id,
            Number(body.quantity),
            body.notes,
            body.reference,
            body.user
        );
    }

    @Get("/:id")
    async getProductById(@Param("id") id: string) {
        return await this.productService.getProductById(id);
    }

    @Post("/")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('owner', 'manager')
    async addProduct(@Body() product: CreateProductDto) {
        return await this.productService.addProduct(product);
    }

    @Patch("/:id")
    @Put("/:id")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('owner', 'manager')
    async updateProduct(@Param("id") id: string, @Body() product: UpdateProductDto) {
        return await this.productService.updateProduct(id, product);
    }

    @Delete("/:id")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('owner', 'manager')
    async deleteProductById(@Param("id") id: string) {
        return await this.productService.deleteProductById(id);
    }
}