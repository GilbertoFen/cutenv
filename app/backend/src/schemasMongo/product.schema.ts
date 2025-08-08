import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
//import { HydratedDocument } from "mongoose"

//export type ProductDocument = HydratedDocument<Product>

@Schema({
    timestamps: true
})
export class Product {

    @Prop({
        required: true,
        trim: true
    })
    name: string

    @Prop({
        required: true,
        trim: true
    })
    brand: string

    @Prop({
        required: true,
        trim: true,
        min: 0
    })
    price: number

    @Prop({
        required: true,
        trim: true,
        min: 0
    })
    quantity: number

    @Prop({
        trim: true
    })
    unitMesure: string //deberia de ser un array [ml, l, g, kg, oz, li, ...]

    @Prop({
        required: true,
        trim: true
    })
    category: string //deberia de ser un array [verduras, lacteos, ...]

    @Prop({
        required: true,
        trim: true
    })
    description: string

    @Prop({
        required: true,
        trim: true,
        min: 0,
        default: 1
    })
    stock: number

    @Prop({
        unique: true,
        required: true,
        trim: true,
    })
    barCode: number
}

export const ProductSchema = SchemaFactory.createForClass(Product)