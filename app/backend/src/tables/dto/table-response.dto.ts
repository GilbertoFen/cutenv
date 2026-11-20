export class TableResponseDto {
  id: string;
  number: number;
  status: string; 
  capacity: number;
  occupiedAt?: Date;
  isVirtual?: boolean;
  tableType?: 'fisica' | 'para_llevar' | 'domicilio' | 'telefonico';
  virtualCode?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
}
