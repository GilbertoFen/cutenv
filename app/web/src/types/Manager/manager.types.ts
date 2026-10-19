import type { SaleData } from "../index";

export type Employee = {
  id: string;
  name: string;
  role: "waiter" | "cook" | "cashier" | "host" | "supervisor";
  clockIn?: string;
  status: "on_shift" | "off_shift";
};

export type Props = {
  allSales: SaleData[];
  defaultDate?: string;
};
