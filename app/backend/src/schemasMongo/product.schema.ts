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
        required: false,
        trim: true,
        default: 'Sin marca'
    })
    brand?: string

    @Prop({
        required: true,
        trim: true,
        min: 0
    })
    price: number

    @Prop({
        required: false,
        default: 1,
        min: 0
    })
    quantity?: number

    @Prop({
        trim: true,
        default: 'pieza'
    })
    unitMesure: string // compatibilidad: unidad base anterior

    @Prop({
        trim: true,
        default: 'pieza'
    })
    purchaseUnit?: string // Unidad de compra: ej. 'caja', 'botella', 'bolsa', 'paquete', 'pieza'

    @Prop({
        type: Number,
        default: 1,
        min: 0
    })
    contentPerUnit?: number // Contenido por empaque: ej. 12 botellas, 1.5 L, 2 kg

    @Prop({
        trim: true,
        default: 'pieza'
    })
    contentUnit?: string // Unidad del contenido: ej. 'l', 'kg', 'ml', 'g', 'pieza'

    @Prop({
        trim: true,
        default: 'pieza'
    })
    baseUnit?: string // Unidad base de inventario para recetas: 'ml', 'g', 'pieza'

    @Prop({
        required: true,
        trim: true
    })
    category: string //deberia de ser un array [verduras, lacteos, ...]

    @Prop({
        required: false,
        trim: true,
        default: ''
    })
    description?: string

    @Prop({
        required: true,
        trim: true,
        min: 0,
        default: 1
    })
    stock: number

    @Prop({
        trim: true,
        type: String,
    })
    barCode?: string

    @Prop({
        trim: true,
    })
    imageUrl?: string

    @Prop({
        default: 'manual',
    })
    source?: string

    @Prop({
        type: Object,
        default: null,
    })
    nutriments?: Record<string, any>

    @Prop({
        trim: true,
    })
    servingSize?: string

    @Prop({
        type: Number,
        default: 0,
        min: 0,
    })
    acquisitionCost?: number // Costo total de compra/adquisición del insumo

    @Prop({
        type: Number,
        default: 0,
        min: 0,
    })
    unitCost?: number // Costo unitario calculado por unidad base de inventario

    @Prop({
        type: Boolean,
        default: false,
    })
    isGeneric?: boolean // Insumo genérico sin código de barras

    @Prop({
        type: Boolean,
        default: false,
    })
    returnableOnCancel?: boolean // Reincorporable a stock al cancelar orden (ej. bebidas envasadas cerradas individuales)

    @Prop({
        type: String,
        required: false,
        default: '90101501',
    })
    claveProdServ?: string

    @Prop({
        type: String,
        required: false,
        default: 'H87',
    })
    claveUnidad?: string

    @Prop({
        type: Boolean,
        default: true,
    })
    isActive?: boolean
}

export const ProductSchema = SchemaFactory.createForClass(Product)
ProductSchema.index({ barCode: 1 }, { unique: true, sparse: true })