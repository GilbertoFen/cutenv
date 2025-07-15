import { IsInt, IsNumber, IsOptional, IsString } from "class-validator"

export class UpdateProductDto{
    @IsString()
    @IsOptional()
    name?: string

    @IsString()
    @IsOptional()
    brand?: string

    @IsNumber()
    @IsOptional()
    price?: number

    @IsInt()
    @IsOptional()
    quantity?: number

    @IsString()
    @IsOptional()
    unitMesure?: string //deberia de ser un array [ml, l, g, kg, oz, li, ...]

    @IsString()
    @IsOptional()
    category?: string //deberia de ser un array [verduras, lacteos, ...]

    @IsString()
    @IsOptional()
    description?: string

    @IsInt()
    @IsOptional()
    stock?: number

    @IsInt()
    @IsOptional()
    barCode?: number
} 
/*
Posibles campos:
    - Proveedor
    - Ubicacion: Pasillo 3, estante 2, seccion A
    - imageUrl
*/