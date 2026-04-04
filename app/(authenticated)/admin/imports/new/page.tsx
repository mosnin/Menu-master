'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createImportJobAction, addImportRowsAction, validateImportAction, getValidFieldsAction } from '@/app/actions/import-actions';
import { Upload, ArrowRight, FileText, CheckCircle } from 'lucide-react';
import type { ImportType } from '@/types';

type Step = 'upload' | 'mapping' | 'preview' | 'complete';

export default function NewImportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('upload');
  const [importType, setImportType] = useState<ImportType>('contacts');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, unknown>[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [validFields, setValidFields] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const text = await file.text();
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length < 2) {
      toast({ title: 'Error', description: 'CSV must have a header row and at least one data row.', variant: 'destructive' });
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    setCsvHeaders(headers);

    const rows = lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, unknown> = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
      return row;
    });
    setCsvRows(rows);

    // Get valid fields for the import type
    const fieldsResult = await getValidFieldsAction(importType);
    if (fieldsResult.data) setValidFields(fieldsResult.data);

    // Auto-map matching headers
    const autoMap: Record<string, string> = {};
    for (const header of headers) {
      const normalized = header.toLowerCase().replace(/\s+/g, '_');
      if (fieldsResult.data?.includes(normalized)) {
        autoMap[header] = normalized;
      }
    }
    setFieldMapping(autoMap);

    setStep('mapping');
  }

  function handleMappingChange(csvHeader: string, dbField: string) {
    setFieldMapping((prev) => ({ ...prev, [csvHeader]: dbField }));
  }

  async function handleStartMapping() {
    setSubmitting(true);

    const result = await createImportJobAction(importType, fileName, fieldMapping);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    const jId = result.data!.jobId;
    setJobId(jId);

    // Add rows
    const rowData = csvRows.map((row, idx) => ({
      rowNumber: idx + 1,
      rawData: row,
    }));
    await addImportRowsAction(jId, rowData);

    // Validate
    const validateResult = await validateImportAction(jId);
    if (validateResult.error) {
      toast({ title: 'Validation failed', description: validateResult.error, variant: 'destructive' });
    } else {
      setStep('preview');
    }

    setSubmitting(false);
  }

  async function handleImport() {
    // In production this would trigger via Inngest; for now just mark complete
    toast({ title: 'Import queued', description: 'Your import is being processed in the background.' });
    setStep('complete');
  }

  return (
    <div className="space-y-10 max-w-3xl">
      <PageHeader
        title="New CSV Import"
        description="Upload a CSV file, map fields, and import data into Deal Desk."
        backHref="/admin/imports"
      />

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(['upload', 'mapping', 'preview', 'complete'] as Step[]).map((s, idx) => (
          <div key={s} className="flex items-center gap-2">
            {idx > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/30" />}
            <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${
              step === s ? 'bg-primary text-primary-foreground' :
              (['upload', 'mapping', 'preview', 'complete'].indexOf(step) > idx ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')
            }`}>
              {s === 'upload' ? '1. Upload' : s === 'mapping' ? '2. Map Fields' : s === 'preview' ? '3. Preview' : '4. Done'}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="p-7">
            <CardTitle className="text-base">Upload CSV</CardTitle>
            <CardDescription>Select what you're importing and upload your CSV file.</CardDescription>
          </CardHeader>
          <CardContent className="px-7 pb-7 space-y-6">
            <div className="space-y-2.5">
              <Label className="text-sm font-medium">Import Type</Label>
              <Select value={importType} onValueChange={(v) => setImportType(v as ImportType)}>
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contacts">Contacts</SelectItem>
                  <SelectItem value="transactions">Transactions</SelectItem>
                  <SelectItem value="properties">Properties</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <Label className="text-sm font-medium">CSV File</Label>
              <div className="border-2 border-dashed rounded-xl p-8 text-center">
                <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="max-w-xs mx-auto"
                />
                <p className="text-[12px] text-muted-foreground/60 mt-2">
                  CSV with header row. Max 5,000 rows.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Field Mapping */}
      {step === 'mapping' && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="p-7">
            <CardTitle className="text-base">Map Fields</CardTitle>
            <CardDescription>
              Map each CSV column to a Deal Desk field. Found {csvRows.length} rows in {fileName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-7 pb-7 space-y-4">
            {csvHeaders.map((header) => (
              <div key={header} className="flex items-center gap-4">
                <div className="w-1/3">
                  <p className="text-[13px] font-medium truncate">{header}</p>
                  <p className="text-[11px] text-muted-foreground/60">
                    e.g., {String(csvRows[0]?.[header] ?? '').slice(0, 30)}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                <div className="flex-1">
                  <Select
                    value={fieldMapping[header] ?? ''}
                    onValueChange={(v) => handleMappingChange(header, v)}
                  >
                    <SelectTrigger className="h-9 rounded-lg text-[13px]">
                      <SelectValue placeholder="Skip this field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Skip this field</SelectItem>
                      {validFields.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep('upload')} className="rounded-lg">
                Back
              </Button>
              <Button
                onClick={handleStartMapping}
                disabled={submitting || Object.keys(fieldMapping).length === 0}
                className="rounded-lg"
              >
                {submitting ? 'Validating...' : 'Validate & Preview'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="p-7">
            <CardTitle className="text-base">Preview Import</CardTitle>
            <CardDescription>
              Review mapped data before importing. {csvRows.length} rows ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-7 pb-7 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">#</th>
                    {Object.values(fieldMapping).filter(Boolean).map((field) => (
                      <th key={field} className="text-left py-2 pr-4 font-medium text-muted-foreground">
                        {field.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvRows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="border-b border-border/30">
                      <td className="py-2 pr-4 text-muted-foreground">{idx + 1}</td>
                      {Object.entries(fieldMapping).filter(([, v]) => v).map(([csvCol]) => (
                        <td key={csvCol} className="py-2 pr-4 truncate max-w-[200px]">
                          {String(row[csvCol] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvRows.length > 5 && (
                <p className="text-[11px] text-muted-foreground/60 mt-2">
                  Showing first 5 of {csvRows.length} rows
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep('mapping')} className="rounded-lg">
                Back
              </Button>
              <Button onClick={handleImport} className="rounded-lg gap-2">
                <Upload className="h-4 w-4" />
                Start Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-semibold">Import Queued</p>
            <p className="text-[13px] text-muted-foreground mt-2">
              Your import of {csvRows.length} rows is being processed. You can track progress on the imports page.
            </p>
            <Button asChild className="mt-6 rounded-lg">
              <a href="/admin/imports">View Imports</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
