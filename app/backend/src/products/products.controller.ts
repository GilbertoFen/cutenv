import { Controller, Delete, Get, Patch, Post, Body, Query, Param, NotFoundException} from "@nestjs/common";

//Services
import { ProductService } from "./products.service";

//Interfaces
import { UpdateProductDto } from "./dto/update-product.dto";
import { CreateProductDto } from "./dto/create-product.dto";

//Controllet solo recibir la peticion, llamar al servicio y devolver la respuesta
//Controller delgado

@Controller("/products")
export class ProductController{
    constructor(private productService: ProductService){}

    @Get("/")
    async getAllProducts(){
        return await this.productService.getAllProducts()
    }
    
    @Get("/:id")
    async getProductById(@Param("id") id: number){
        return await this.productService.getProductById(id)
    }

    @Post("/")
    async addProduct(@Body() product: CreateProductDto){
        return await this.productService.addProduct(product)
    }

    @Patch("/:id")
    async updateProduct(@Param("id") id: number, @Body() product: UpdateProductDto){
        return await this.productService.updateProduct(id, product)
    }

    @Delete("/:id")
    async deleteProductById(@Param("id") id: number){
        return await this.productService.deleteProductById(id)
    }
}