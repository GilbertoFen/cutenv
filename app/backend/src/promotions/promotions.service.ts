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
import {
  evaluatePromotion,
  isPromotionActiveToday,
  EvaluatedItem,
  PromotionEvaluationResult,
  PromotionEngineOptions,
} from './engine/promotions-engine';

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
    return this.promotionModel
      .find(filter)
      .populate('targetRecipes', 'name price category')
      .populate('excludedRecipes', 'name price category')
      .populate('triggerRecipeId', 'name price category')
      .populate('rewardRecipeId', 'name price category')
      .sort({ createdAt: -1 });
  }

  /**
   * Obtiene promociones vigentes de acuerdo con la fecha y hora del SERVIDOR.
   */
  async getValidPromotionsForToday(): Promise<Promotion[]> {
    const now = new Date();
    const promotions = await this.promotionModel
      .find({ isActive: true })
      .populate('targetRecipes', 'name price category')
      .populate('excludedRecipes', 'name price category')
      .populate('triggerRecipeId', 'name price category')
      .populate('rewardRecipeId', 'name price category');

    return promotions.filter((promo) => {
      const check = isPromotionActiveToday(promo as any, now);
      return check.valid;
    });
  }

  async getPromotionById(id: string): Promise<PromotionDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de promoción inválido');
    }
    const promo = await this.promotionModel
      .findById(id)
      .populate('targetRecipes', 'name price category')
      .populate('excludedRecipes', 'name price category')
      .populate('triggerRecipeId', 'name price category')
      .populate('rewardRecipeId', 'name price category');
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

    // Normalizar categorías: unir targetCategories y applicableCategories
    const mergedCategories = Array.from(
      new Set([...(dto.targetCategories || []), ...(dto.applicableCategories || [])])
    );

    // Salvaguarda: si se especifican categorías pero el scope quedó como 'all', ajustarlo a 'categories'
    let effectiveScope = dto.scope || 'all';
    if (effectiveScope === 'all' && mergedCategories.length > 0) {
      effectiveScope = 'categories';
    }

    const created = new this.promotionModel({
      name: dto.name.trim(),
      code: dto.code ? dto.code.trim().toUpperCase() : undefined,
      type: dto.type,
      daysOfWeek: dto.daysOfWeek || [],
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      startTime: dto.startTime ? dto.startTime.trim() : undefined,
      endTime: dto.endTime ? dto.endTime.trim() : undefined,
      scope: effectiveScope,
      targetCategories: mergedCategories,
      applicableCategories: mergedCategories,
      targetRecipes: (dto.targetRecipes || []).map((id) => new Types.ObjectId(id)),
      excludedRecipes: (dto.excludedRecipes || []).map((id) => new Types.ObjectId(id)),
      buyQuantity: dto.buyQuantity ?? 2,
      getQuantity: dto.getQuantity ?? 1,
      triggerRecipeId: dto.triggerRecipeId ? new Types.ObjectId(dto.triggerRecipeId) : undefined,
      triggerQuantity: dto.triggerQuantity ?? 1,
      rewardRecipeId: dto.rewardRecipeId ? new Types.ObjectId(dto.rewardRecipeId) : undefined,
      rewardQuantity: dto.rewardQuantity ?? 1,
      discountValue: dto.discountValue || 0,
      minOrderAmount: dto.minOrderAmount || 0,
      maxDiscountAmount: dto.maxDiscountAmount || 0,
      maxApplicationsPerOrder: dto.maxApplicationsPerOrder || 0,
      applyMode: dto.applyMode || 'mix_and_match',
      requiresAuth: dto.requiresAuth ?? (dto.type === 'birthday'),
      isCumulative: dto.isCumulative ?? false,
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

    const promo = await this.getPromotionById(id);

    if (dto.name !== undefined) promo.name = dto.name.trim();
    if (dto.code !== undefined) promo.code = dto.code ? dto.code.trim().toUpperCase() : undefined;
    if (dto.type !== undefined) promo.type = dto.type;
    if (dto.daysOfWeek !== undefined) promo.daysOfWeek = dto.daysOfWeek;
    if (dto.startDate !== undefined) promo.startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    if (dto.endDate !== undefined) promo.endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    if (dto.startTime !== undefined) promo.startTime = dto.startTime ? dto.startTime.trim() : undefined;
    if (dto.endTime !== undefined) promo.endTime = dto.endTime ? dto.endTime.trim() : undefined;

    const mergedCategories = Array.from(
      new Set([
        ...(dto.targetCategories !== undefined ? dto.targetCategories : promo.targetCategories || []),
        ...(dto.applicableCategories !== undefined ? dto.applicableCategories : promo.applicableCategories || []),
      ])
    );

    let effectiveScope = dto.scope !== undefined ? dto.scope : promo.scope;
    if (effectiveScope === 'all' && mergedCategories.length > 0 && (dto.targetCategories || dto.applicableCategories)) {
      effectiveScope = 'categories';
    }

    promo.scope = effectiveScope;
    promo.targetCategories = mergedCategories;
    promo.applicableCategories = mergedCategories;

    if (dto.targetRecipes !== undefined) {
      promo.targetRecipes = dto.targetRecipes.map((rId) => new Types.ObjectId(rId));
    }
    if (dto.excludedRecipes !== undefined) {
      promo.excludedRecipes = dto.excludedRecipes.map((rId) => new Types.ObjectId(rId));
    }
    if (dto.buyQuantity !== undefined) promo.buyQuantity = dto.buyQuantity;
    if (dto.getQuantity !== undefined) promo.getQuantity = dto.getQuantity;
    if (dto.triggerRecipeId !== undefined) {
      promo.triggerRecipeId = dto.triggerRecipeId ? new Types.ObjectId(dto.triggerRecipeId) : undefined;
    }
    if (dto.triggerQuantity !== undefined) promo.triggerQuantity = dto.triggerQuantity;
    if (dto.rewardRecipeId !== undefined) {
      promo.rewardRecipeId = dto.rewardRecipeId ? new Types.ObjectId(dto.rewardRecipeId) : undefined;
    }
    if (dto.rewardQuantity !== undefined) promo.rewardQuantity = dto.rewardQuantity;
    if (dto.discountValue !== undefined) promo.discountValue = dto.discountValue;
    if (dto.minOrderAmount !== undefined) promo.minOrderAmount = dto.minOrderAmount;
    if (dto.maxDiscountAmount !== undefined) promo.maxDiscountAmount = dto.maxDiscountAmount;
    if (dto.maxApplicationsPerOrder !== undefined) promo.maxApplicationsPerOrder = dto.maxApplicationsPerOrder;
    if (dto.applyMode !== undefined) promo.applyMode = dto.applyMode;
    if (dto.requiresAuth !== undefined) promo.requiresAuth = dto.requiresAuth;
    if (dto.isCumulative !== undefined) promo.isCumulative = dto.isCumulative;
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

    const promo = await this.getPromotionById(id);

    promo.isActive = false;
    promo.updatedBy = auth.manager.username;
    await promo.save();

    return { success: true, message: `Promoción "${promo.name}" dada de baja correctamente` };
  }

  /**
   * Calcula el beneficio real de una promoción sobre los artículos de una cuenta.
   * Utiliza el motor centralizado de promociones como fuente de verdad.
   */
  async calculateDiscount(
    promotionId: string,
    items: EvaluatedItem[],
    accountTotal: number,
    options: PromotionEngineOptions = {}
  ): Promise<PromotionEvaluationResult> {
    const promo = await this.getPromotionById(promotionId);
    if (!promo || !promo.isActive) {
      throw new BadRequestException('La promoción seleccionada no se encuentra activa');
    }

    return evaluatePromotion(promo as any, items, accountTotal, options);
  }

  /**
   * Extrae los artículos y recetas reales de una cuenta/venta poblada de MongoDB
   * y calcula la promoción usando precios y categorías autorizadas del servidor.
   */
  async calculateDiscountForSale(
    saleDoc: any,
    promotionId: string,
    options: PromotionEngineOptions = {}
  ): Promise<PromotionEvaluationResult> {
    const promo = await this.getPromotionById(promotionId);
    if (!promo || !promo.isActive) {
      throw new BadRequestException('La promoción seleccionada no se encuentra activa');
    }

    const items: EvaluatedItem[] = [];
    let serverTotal = 0;

    for (const order of saleDoc.orders || []) {
      // Ignorar órdenes canceladas para no inflar la base contable ni los beneficios
      if (order.status === 'cancelled') continue;

      for (const it of order.items || []) {
        // Ignorar platillos individuales cancelados
        if (it.status === 'cancelled') continue;

        const recipe = it.recipe;
        if (!recipe) continue;

        const price = Number(recipe.price ?? it.price ?? 0);
        const qty = Number(it.quantity ?? 1);
        serverTotal += price * qty;

        items.push({
          recipeId: recipe._id ? recipe._id.toString() : recipe.id ? String(recipe.id) : undefined,
          recipeName: recipe.name ?? 'Producto',
          category: recipe.category ?? '',
          price,
          quantity: qty,
        });
      }
    }

    serverTotal = Math.round((serverTotal + Number.EPSILON) * 100) / 100;
    return evaluatePromotion(promo as any, items, serverTotal, options);
  }
}
