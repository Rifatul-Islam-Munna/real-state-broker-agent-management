import { Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pdf_generation')
export class PdfGeneration {
  @PrimaryGeneratedColumn()
  id: number;
}
