import { IsNumber, IsOptional, IsString } from "class-validator";

export class CreateProductDto {
    @IsString()
    name: string;

    @IsString()
    brand: string;

    @IsNumber()
    price: number;

    @IsNumber()
    quantity: number;

    @IsOptional()
    @IsString()
    unitMesure?: string;

    @IsOptional()
    @IsString()
    purchaseUnit?: string;

    @IsOptional()
    @IsNumber()
    contentPerUnit?: number;

    @IsOptional()
    @IsString()
    contentUnit?: string;

    @IsOptional()
    @IsString()
    baseUnit?: string;

    @IsString()
    category: string;

    @IsString()
    description: string;

    @IsNumber()
    stock: number;

    @IsOptional()
    barCode?: string | number;

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @IsOptional()
    @IsString()
    source?: string;

    @IsOptional()
    nutriments?: Record<string, any>;

    @IsOptional()
    @IsString()
    servingSize?: string;
}