import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Promotion, PromotionDocument } from '../schemasMongo/promotion.schema';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectModel(Promotion.name) private promotionModel: Model<PromotionDocument>,
    private authService: AuthService,
  ) {}

  async getAllPromotions(activeOnly = false): Promise<Promotion[]> {
    const filter: any = {};
    if (activeOnly) {
      filter.isActive = true;
    }
    return this.promotionModel.find(filter).sort({ createdAt: -1 });
  }

  /**
   * Obtiene promociones vigentes de acuerdo con la fecha y hora del SERVIDOR.
   */
  async getValidPromotionsForToday(): Promise<Promotion[]> {
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado

    const promotions = await this.promotionModel.find({ isActive: true });

    return promotions.filter((promo) => {
      // Validar rango de fechas si existen
      if (promo.startDate && new Date(promo.startDate) > now) return false;
      if (promo.endDate) {
        const end = new Date(promo.endDate);
        end.setHours(23, 59, 59, 999);
        if (now > end) return false;
      }

      // Validar día de la semana (si daysOfWeek está vacío o contiene el día actual, aplica)
      if (promo.daysOfWeek && promo.daysOfWeek.length > 0) {
        if (!promo.daysOfWeek.includes(currentDayOfWeek)) return false;
      }

      return true;
    });
  }

  async getPromotionById(id: string): Promise<Promotion> {
    const promo = await this.promotionModel.findById(id);
    if (!promo) throw new NotFoundException('Promoción no encontrada');
    return promo;
  }

  async createPromotion(dto: CreatePromotionDto): Promise<Promotion> {
    const auth = await this.authService.verifyManager({
      username: dto.authUsername,
      password: dto.authPassword,
    });
    if (!auth.valid) {
      throw new UnauthorizedException('Credenciales de gerente no válidas');
    }

    if (dto.code) {
      const existing = await this.promotionModel.findOne({
        code: dto.code.trim().toUpperCase(),
        isActive: true,
      });
      if (existing) {
        throw new BadRequestException(`El código de cupón "${dto.code}" ya está en uso.`);
      }
    }

    const created = new this.promotionModel({
      name: dto.name.trim(),
      code: dto.code ? dto.code.trim().toUpperCase() : undefined,
      type: dto.type,
      daysOfWeek: dto.daysOfWeek || [],
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      scope: dto.scope || 'all',
      targetCategories: dto.targetCategories || [],
      targetRecipes: (dto.targetRecipes || []).map((id) => new Types.ObjectId(id)),
      discountValue: dto.discountValue || 0,
      minOrderAmount: dto.minOrderAmount || 0,
      description: dto.description?.trim(),
      isActive: true,
      createdBy: auth.manager.username,
    });

    return await created.save();
  }

  async updatePromotion(id: string, dto: UpdatePromotionDto): Promise<Promotion> {
    const auth = await this.authService.verifyManager({
      username: dto.authUsername,
      password: dto.authPassword,
    });
    if (!auth.valid) {
      throw new UnauthorizedException('Credenciales de gerente no válidas');
    }

    const promo = await this.promotionModel.findById(id);
    if (!promo) throw new NotFoundException('Promoción no encontrada');

    if (dto.name !== undefined) promo.name = dto.name.trim();
    if (dto.code !== undefined) promo.code = dto.code ? dto.code.trim().toUpperCase() : undefined;
    if (dto.type !== undefined) promo.type = dto.type;
    if (dto.daysOfWeek !== undefined) promo.daysOfWeek = dto.daysOfWeek;
    if (dto.startDate !== undefined) promo.startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    if (dto.endDate !== undefined) promo.endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    if (dto.scope !== undefined) promo.scope = dto.scope;
    if (dto.targetCategories !== undefined) promo.targetCategories = dto.targetCategories;
    if (dto.targetRecipes !== undefined) {
      promo.targetRecipes = dto.targetRecipes.map((rId) => new Types.ObjectId(rId));
    }
    if (dto.discountValue !== undefined) promo.discountValue = dto.discountValue;
    if (dto.minOrderAmount !== undefined) promo.minOrderAmount = dto.minOrderAmount;
    if (dto.description !== undefined) promo.description = dto.description.trim();
    if (dto.isActive !== undefined) promo.isActive = dto.isActive;

    promo.updatedBy = auth.manager.username;

    return await promo.save();
  }

  async deletePromotion(
    id: string,
    authCredentials: { authUsername: string; authPassword: string }
  ): Promise<{ success: boolean; message: string }> {
    const auth = await this.authService.verifyManager({
      username: authCredentials.authUsername,
      password: authCredentials.authPassword,
    });
    if (!auth.valid) {
      throw new UnauthorizedException('Credenciales de gerente no válidas');
    }

    const promo = await this.promotionModel.findById(id);
    if (!promo) throw new NotFoundException('Promoción no encontrada');

    promo.isActive = false;
    promo.updatedBy = auth.manager.username;
    await promo.save();

    return { success: true, message: `Promoción "${promo.name}" dada de baja correctamente` };
  }

  /**
   * Calcula el beneficio real de una promoción sobre los artículos de una cuenta.
   * Evita importes negativos y respeta elegibilidad.
   */
  async calculateDiscount(
    promotionId: string,
    items: Array<{ recipeId?: string; recipeName: string; category?: string; price: number; quantity: number }>,
    accountTotal: number
  ) {
    const promo = await this.getPromotionById(promotionId);
    if (!promo || !promo.isActive) {
      throw new BadRequestException('La promoción seleccionada no se encuentra activa');
    }

    // Filtrar artículos elegibles
    const eligibleUnits: Array<{ name: string; price: number; category?: string }> = [];

    for (const it of items) {
      const q = Math.max(0, it.quantity || 0);
      let isEligible = false;

      if (promo.scope === 'all') {
        isEligible = true;
      } else if (promo.scope === 'categories' && it.category) {
        isEligible = (promo.targetCategories || []).some(
          (c) => c.toLowerCase() === it.category!.toLowerCase()
        );
      } else if (promo.scope === 'recipes' && it.recipeId) {
        isEligible = (promo.targetRecipes || []).some(
          (rId) => rId.toString() === it.recipeId
        );
      }

      if (isEligible) {
        for (let i = 0; i < q; i++) {
          eligibleUnits.push({ name: it.recipeName, price: it.price, category: it.category });
        }
      }
    }

    const eligibleSubtotal = eligibleUnits.reduce((acc, u) => acc + u.price, 0);

    if (promo.minOrderAmount && accountTotal < promo.minOrderAmount) {
      throw new BadRequestException(
        `El pedido no cumple el monto mínimo de $${promo.minOrderAmount.toFixed(2)} para esta promoción`
      );
    }

    if (eligibleUnits.length === 0) {
      return {
        promotionId: promo['_id'],
        name: promo.name,
        type: promo.type,
        discountAmount: 0,
        eligibleUnitsCount: 0,
        benefitedItems: [],
        finalTotal: accountTotal,
        message: 'No hay productos elegibles en esta comanda para la promoción',
      };
    }

    let discountAmount = 0;
    const benefitedItems: string[] = [];

    if (promo.type === 'two_for_one') {
      // 2x1: Por cada 2 unidades elegibles, 1 es gratis (se bonifica la unidad de menor o igual precio)
      eligibleUnits.sort((a, b) => a.price - b.price); // Ordenar ascendente
      const freeUnitsCount = Math.floor(eligibleUnits.length / 2);

      for (let i = 0; i < freeUnitsCount; i++) {
        discountAmount += eligibleUnits[i].price;
        benefitedItems.push(`${eligibleUnits[i].name} (100% bonificado por 2x1)`);
      }
    } else if (promo.type === 'percentage_discount') {
      const pct = Math.min(100, Math.max(0, promo.discountValue));
      discountAmount = Math.round((eligibleSubtotal * (pct / 100) + Number.EPSILON) * 100) / 100;
      benefitedItems.push(`${pct}% de descuento sobre artículos elegibles ($${eligibleSubtotal.toFixed(2)})`);
    } else if (promo.type === 'fixed_discount') {
      discountAmount = Math.min(promo.discountValue, eligibleSubtotal);
      benefitedItems.push(`Descuento directo de $${discountAmount.toFixed(2)}`);
    }

    // El descuento nunca puede superar el subtotal elegible ni el total de la cuenta
    discountAmount = Math.min(discountAmount, accountTotal);
    const finalTotal = Math.max(0, Math.round((accountTotal - discountAmount + Number.EPSILON) * 100) / 100);

    return {
      promotionId: promo['_id'],
      name: promo.name,
      type: promo.type,
      discountAmount,
      eligibleUnitsCount: eligibleUnits.length,
      benefitedItems,
      finalTotal,
    };
  }
}
