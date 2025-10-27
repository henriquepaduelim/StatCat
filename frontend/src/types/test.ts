export interface TestDefinition {
  id: number;
  name: string;
  category?: string | null;
  unit?: string;
  description?: string | null;
  target_direction: string;
}
