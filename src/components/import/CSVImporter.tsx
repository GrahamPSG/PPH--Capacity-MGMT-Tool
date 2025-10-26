'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Users,
  Briefcase,
  Calendar
} from 'lucide-react';

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  warnings?: string[];
}

type ImportType = 'projects' | 'phases' | 'employees';

export function CSVImporter() {
  const [importing, setImporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [results, setResults] = useState<Record<ImportType, ImportResult | null>>({
    projects: null,
    phases: null,
    employees: null
  });
  const [errors, setErrors] = useState<Record<ImportType, string | null>>({
    projects: null,
    phases: null,
    employees: null
  });

  const handleFileUpload = async (file: File, type: ImportType) => {
    setImporting(true);
    setUploadProgress(0);
    setErrors({ ...errors, [type]: null });
    setResults({ ...results, [type]: null });

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/import/${type}`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setResults({
        ...results,
        [type]: {
          success: data.success,
          imported: data.imported || 0,
          failed: data.failed || 0,
          warnings: data.warnings || []
        }
      });
    } catch (error) {
      setErrors({
        ...errors,
        [type]: error instanceof Error ? error.message : 'Import failed'
      });
    } finally {
      setImporting(false);
      setUploadProgress(0);
    }
  };

  const handleDownloadTemplate = (type: ImportType) => {
    window.open(`/api/import/template?type=${type}`, '_blank');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: ImportType) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, type);
    }
  };

  const renderImportCard = (
    type: ImportType,
    title: string,
    description: string,
    icon: React.ReactNode
  ) => {
    const result = results[type];
    const error = errors[type];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Download Template */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleDownloadTemplate(type)}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>

          {/* Upload Area */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-sm text-gray-600 mb-3">
              Drag and drop your CSV file here, or click to browse
            </p>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              id={`file-${type}`}
              onChange={(e) => handleFileSelect(e, type)}
              disabled={importing}
            />
            <label htmlFor={`file-${type}`}>
              <Button
                variant="secondary"
                disabled={importing}
                className="cursor-pointer"
                asChild
              >
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Select File
                </span>
              </Button>
            </label>
          </div>

          {/* Progress Bar */}
          {importing && uploadProgress > 0 && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-center text-gray-600">
                Importing... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Results */}
          {result && (
            <Alert className={result.success ? 'border-green-500' : 'border-yellow-500'}>
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                )}
                <div className="flex-1">
                  <AlertTitle>Import Complete</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-1">
                      <p>✓ Imported: {result.imported} records</p>
                      {result.failed > 0 && (
                        <p>✗ Failed: {result.failed} records</p>
                      )}
                      {result.warnings && result.warnings.length > 0 && (
                        <div className="mt-2">
                          <p className="font-semibold">Warnings:</p>
                          <ul className="list-disc list-inside text-sm">
                            {result.warnings.slice(0, 3).map((warning, i) => (
                              <li key={i}>{warning}</li>
                            ))}
                            {result.warnings.length > 3 && (
                              <li>...and {result.warnings.length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          {/* Errors */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Import Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Data Import</h2>
        <p className="text-muted-foreground">
          Import projects, phases, and employees from CSV files
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Import Order</AlertTitle>
        <AlertDescription>
          For best results, import data in this order:
          <ol className="list-decimal list-inside mt-2">
            <li>Employees (if creating new employees)</li>
            <li>Projects</li>
            <li>Phases (requires existing projects)</li>
          </ol>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="phases">Phases</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-6">
          {renderImportCard(
            'projects',
            'Import Projects',
            'Import multiple projects with client details, dates, and budgets',
            <Briefcase className="h-5 w-5" />
          )}
        </TabsContent>

        <TabsContent value="phases" className="mt-6">
          {renderImportCard(
            'phases',
            'Import Phases',
            'Import project phases with crew requirements and schedules',
            <Calendar className="h-5 w-5" />
          )}
        </TabsContent>

        <TabsContent value="employees" className="mt-6">
          {renderImportCard(
            'employees',
            'Import Employees',
            'Import or update employee records with roles and divisions',
            <Users className="h-5 w-5" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}