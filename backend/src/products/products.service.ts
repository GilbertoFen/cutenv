import { Injectable, NotFoundException } from "@nestjs/common";

//Interfaces
import { UpdateProductDto } from "./dto/update-product.dto";
import { CreateProductDto } from "./dto/create-product.dto";

//Mongoose
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { Product } from "schemasMongo/product.schema";

//El servicion tiene toda la logica del negocio, sabe si los productos existen o no
@Injectable()
export class ProductService {
    //Si mongoose le da otro nombre a mi schema, lo llamo con Product.name
    constructor(@InjectModel(Product.name) private productModel: Model<Product>) { }

    async getAllProducts() {
        try {
            return await this.productModel.find({})
        } catch (e) {
            throw e
        }
    }

    async getProductById(id: number) {
        try {
            const product = await this.productModel.findById(id)
            if (!product) throw new NotFoundException("Product does not exist")
            return product
        } catch (e) {
            throw e
        }
    }

    async addProduct(product: CreateProductDto) {
        //Genera un nuevo documento product en la base de datos con el Schema que definimos
        //el producto lleva la forma del DTO
        try {
            const createdProduct = new this.productModel(product)
            return await createdProduct.save()
        } catch (e) {
            throw e
        }
    }

    async updateProduct(id: number, product: UpdateProductDto) {
        try {
            const updatedProduct = await this.productModel.findByIdAndUpdate(id, product, { new: true })
            if (!updatedProduct) throw new NotFoundException("Product does not exit")
            return updatedProduct
        } catch (e) {
            throw e
        }
    }

    async deleteProductById(id: number) {
        try {
            const deletedProduct = await this.productModel.findByIdAndDelete(id)
            if (!deletedProduct) throw new NotFoundException("Product does not exist")

            return deletedProduct
        } catch (e) {
            throw e
        }
    }
}