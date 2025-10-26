import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import {
  ProjectType,
  ProjectStatus,
  Division,
  Subdivision,
  PhaseType,
  PhaseStatus,
  EmployeeType
} from '@prisma/client';
import { format } from 'date-fns';

// CSV Row schemas
const projectCSVSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['NEW_CONSTRUCTION', 'RENOVATION', 'SERVICE', 'MAINTENANCE']),
  division: z.enum(['PLUMBING', 'HVAC']),
  subdivision: z.enum(['MULTIFAMILY', 'COMMERCIAL', 'CUSTOM']),
  status: z.enum(['QUOTED', 'AWARDED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
  clientName: z.string(),
  location: z.string(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  estimatedHours: z.string().transform(val => parseInt(val)),
  actualHours: z.string().transform(val => parseInt(val)).optional(),
  budget: z.string().transform(val => parseFloat(val)).optional(),
  actualCost: z.string().transform(val => parseFloat(val)).optional(),
  projectManager: z.string().optional(),
  notes: z.string().optional()
});

const phaseCSVSchema = z.object({
  projectName: z.string().min(1),
  phaseType: z.string(),
  name: z.string().min(1),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  foremanRequired: z.string().transform(val => parseInt(val)),
  journeymenRequired: z.string().transform(val => parseInt(val)),
  apprenticesRequired: z.string().transform(val => parseInt(val)),
  progress: z.string().transform(val => parseInt(val)).optional(),
  notes: z.string().optional()
});

const employeeCSVSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  employeeCode: z.string().min(1),
  role: z.enum(['FOREMAN', 'JOURNEYMAN', 'APPRENTICE', 'HELPER']),
  division: z.enum(['PLUMBING', 'HVAC']),
  subdivision: z.enum(['MULTIFAMILY', 'COMMERCIAL', 'CUSTOM']),
  phone: z.string().optional(),
  maxHoursPerWeek: z.string().transform(val => parseInt(val)),
  hourlyRate: z.string().transform(val => parseFloat(val)).optional(),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  isActive: z.string().transform(val => val.toLowerCase() === 'true' || val === '1')
});

export type ProjectCSVRow = z.infer<typeof projectCSVSchema>;
export type PhaseCSVRow = z.infer<typeof phaseCSVSchema>;
export type EmployeeCSVRow = z.infer<typeof employeeCSVSchema>;

export interface ParseResult<T> {
  data: T[];
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    message: string;
  }>;
}

export class CSVParser {
  static parseProjects(csvContent: string): ParseResult<ProjectCSVRow> {
    return this.parseCSV(csvContent, projectCSVSchema, 'projects');
  }

  static parsePhases(csvContent: string): ParseResult<PhaseCSVRow> {
    return this.parseCSV(csvContent, phaseCSVSchema, 'phases');
  }

  static parseEmployees(csvContent: string): ParseResult<EmployeeCSVRow> {
    return this.parseCSV(csvContent, employeeCSVSchema, 'employees');
  }

  private static parseCSV<T>(
    csvContent: string,
    schema: z.ZodSchema<T>,
    type: string
  ): ParseResult<T> {
    const result: ParseResult<T> = {
      data: [],
      errors: [],
      warnings: []
    };

    try {
      // Parse CSV
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: false,
        relax_quotes: true
      });

      // Validate each row
      records.forEach((record: any, index: number) => {
        const rowNum = index + 2; // Account for header row

        try {
          // Clean empty strings to undefined
          Object.keys(record).forEach(key => {
            if (record[key] === '') {
              delete record[key];
            }
          });

          const validatedData = schema.parse(record);
          result.data.push(validatedData);

          // Add warnings for common issues
          if (type === 'projects') {
            const proj = record as any;
            if (proj.startDate && proj.endDate && new Date(proj.startDate) > new Date(proj.endDate)) {
              result.warnings.push({
                row: rowNum,
                message: 'End date is before start date'
              });
            }
          }
        } catch (error) {
          if (error instanceof z.ZodError) {
            error.issues.forEach(issue => {
              result.errors.push({
                row: rowNum,
                field: issue.path.join('.'),
                message: issue.message
              });
            });
          } else {
            result.errors.push({
              row: rowNum,
              message: 'Unexpected error parsing row'
            });
          }
        }
      });
    } catch (error) {
      result.errors.push({
        row: 0,
        message: 'Failed to parse CSV file. Please check the format.'
      });
    }

    return result;
  }

  // Generate template CSVs
  static generateProjectTemplate(): string {
    const headers = [
      'name',
      'type',
      'division',
      'subdivision',
      'status',
      'clientName',
      'location',
      'startDate',
      'endDate',
      'estimatedHours',
      'actualHours',
      'budget',
      'actualCost',
      'projectManager',
      'notes'
    ];

    const sampleData = [
      [
        'Downtown Office Complex',
        'NEW_CONSTRUCTION',
        'PLUMBING',
        'COMMERCIAL',
        'AWARDED',
        'ABC Corp',
        '123 Main St, Denver',
        '2024-03-01',
        '2024-08-31',
        '2400',
        '',
        '450000',
        '',
        'John Smith',
        'Phase 1 of 3'
      ],
      [
        'Mountain View Apartments',
        'NEW_CONSTRUCTION',
        'HVAC',
        'MULTIFAMILY',
        'IN_PROGRESS',
        'XYZ Properties',
        '456 Oak Ave, Boulder',
        '2024-02-15',
        '2024-07-15',
        '3200',
        '1800',
        '680000',
        '340000',
        'Jane Doe',
        '40 units'
      ]
    ];

    return [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n');
  }

  static generatePhaseTemplate(): string {
    const headers = [
      'projectName',
      'phaseType',
      'name',
      'status',
      'startDate',
      'endDate',
      'foremanRequired',
      'journeymenRequired',
      'apprenticesRequired',
      'progress',
      'notes'
    ];

    const sampleData = [
      [
        'Downtown Office Complex',
        'UNDERGROUND',
        'Underground Rough-In',
        'NOT_STARTED',
        '2024-03-01',
        '2024-03-21',
        '1',
        '2',
        '1',
        '0',
        'Coordination required with electrical'
      ],
      [
        'Mountain View Apartments',
        'ROUGH_IN',
        'HVAC Rough-In',
        'IN_PROGRESS',
        '2024-03-15',
        '2024-04-30',
        '1',
        '3',
        '2',
        '35',
        'Building A and B complete'
      ]
    ];

    return [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n');
  }

  static generateEmployeeTemplate(): string {
    const headers = [
      'name',
      'email',
      'employeeCode',
      'role',
      'division',
      'subdivision',
      'phone',
      'maxHoursPerWeek',
      'hourlyRate',
      'hireDate',
      'isActive'
    ];

    const sampleData = [
      [
        'Robert Johnson',
        'rjohnson@pphmechanical.com',
        'PLB-001',
        'FOREMAN',
        'PLUMBING',
        'COMMERCIAL',
        '303-555-0100',
        '40',
        '65',
        '2015-06-15',
        'true'
      ],
      [
        'Maria Garcia',
        'mgarcia@pphmechanical.com',
        'HVC-002',
        'JOURNEYMAN',
        'HVAC',
        'MULTIFAMILY',
        '303-555-0101',
        '40',
        '45',
        '2018-09-01',
        'true'
      ]
    ];

    return [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n');
  }
}