import { IsInt, IsNumber, IsOptional, IsString } from "class-validator"

export class CreateProductDto{
    @IsString()
    name: string

    @IsString()
    brand: string

    @IsNumber()
    price: number

    @IsInt()
    quantity: number

    @IsOptional()
    @IsString()
    unitMesure?: string //deberia de ser un array [ml, l, g, kg, oz, li, ...]

    @IsString()
    category: string //deberia de ser un array [verduras, lacteos, ...]

    @IsString()
    description: string

    @IsInt()
    stock: number

    @IsInt()
    barCode: number
} 

/*
Posibles campos:
    - Proveedor
    - Ubicacion: Pasillo 3, estante 2, seccion A
    - imageUrl
*/