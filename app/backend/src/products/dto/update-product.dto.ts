import { IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateProductDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    brand?: string;

    @IsNumber()
    @IsOptional()
    price?: number;

    @IsNumber()
    @IsOptional()
    quantity?: number;

    @IsString()
    @IsOptional()
    unitMesure?: string;

    @IsString()
    @IsOptional()
    purchaseUnit?: string;

    @IsNumber()
    @IsOptional()
    contentPerUnit?: number;

    @IsString()
    @IsOptional()
    contentUnit?: string;

    @IsString()
    @IsOptional()
    baseUnit?: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @IsOptional()
    stock?: number;

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