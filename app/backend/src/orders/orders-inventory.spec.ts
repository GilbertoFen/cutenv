import { convertUnit } from '../common/utils/unit-converter.util';

describe('Orders Inventory Deductions and Conversions', () => {
  describe('Unit Conversions for Recipes', () => {
    it('debe convertir correctamente gramos a kilogramos', () => {
      // 500g a kg -> 0.5kg
      const result = convertUnit(500, 'g', 'kg');
      expect(result).toBeCloseTo(0.5, 4);
    });

    it('debe convertir correctamente mililitros a litros', () => {
      // 250ml a l -> 0.25l
      const result = convertUnit(250, 'ml', 'l');
      expect(result).toBeCloseTo(0.25, 4);
    });

    it('debe mantener la misma cantidad cuando las unidades coinciden', () => {
      const result = convertUnit(3, 'pieza', 'pieza');
      expect(result).toBe(3);
    });

    it('debe manejar unidades compatibles con mayúsculas/minúsculas y espacios', () => {
      const result = convertUnit(1000, ' G ', 'KG');
      expect(result).toBeCloseTo(1, 4);
    });
  });

  describe('Stock Movement Logic', () => {
    it('debe calcular correctamente el nuevo stock tras deducción', () => {
      const initialStock = 10; // 10 kg
      const deduction = convertUnit(350, 'g', 'kg'); // 0.35 kg
      const newStock = Math.max(0, +(initialStock - deduction).toFixed(4));
      expect(newStock).toBe(9.65);
    });

    it('debe calcular correctamente la restitución de stock al cancelar o eliminar comanda', () => {
      const currentStock = 9.65;
      const restitution = convertUnit(350, 'g', 'kg'); // 0.35 kg
      const restoredStock = +(currentStock + restitution).toFixed(4);
      expect(restoredStock).toBe(10);
    });

    it('no debe permitir stock negativo en deducción masiva', () => {
      const currentStock = 0.2;
      const deduction = 0.5;
      const newStock = Math.max(0, +(currentStock - deduction).toFixed(4));
      expect(newStock).toBe(0);
    });
  });
});
