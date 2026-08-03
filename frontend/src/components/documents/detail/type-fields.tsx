import { Field, FieldGrid, LineList, PillList, Section } from "@/components/documents/detail/field";
import type { DocumentData } from "@/lib/types";

export function TypeFields({ data }: { data: DocumentData }) {
  return (
    <div className="flex flex-col gap-6">
      <TypeSpecificFields data={data} />
      {data.additional_information.length > 0 && (
        <Section title="Additional information">
          <LineList items={data.additional_information} />
        </Section>
      )}
    </div>
  );
}

function TypeSpecificFields({ data }: { data: DocumentData }) {
  if (data.document_type === "RESUME") {
    return (
      <>
        <FieldGrid>
          <Field label="Name" value={data.name} />
          <Field label="Email" value={data.email} />
          <Field label="Phone" value={data.phone} />
          <Field
            label="LinkedIn"
            value={data.linkedin && <a className="text-primary hover:underline" href={data.linkedin}>{data.linkedin}</a>}
          />
          <Field
            label="GitHub"
            value={data.github && <a className="text-primary hover:underline" href={data.github}>{data.github}</a>}
          />
        </FieldGrid>

        {data.summary && (
          <Section title="Summary">
            <p className="text-sm leading-relaxed text-foreground">{data.summary}</p>
          </Section>
        )}

        <Section title="Skills">
          <PillList items={data.skills} />
        </Section>
        <Section title="Experience">
          <LineList items={data.experience} groupEntries />
        </Section>
        <Section title="Education">
          <LineList items={data.education} />
        </Section>
        <Section title="Projects">
          <LineList items={data.projects} groupEntries />
        </Section>
        <Section title="Certifications">
          <LineList items={data.certifications} />
        </Section>
      </>
    );
  }

  if (data.document_type === "EMAIL") {
    return (
      <>
        <FieldGrid>
          <Field label="From" value={data.sender} />
          <Field label="To" value={data.recipient} />
          <Field label="Subject" value={data.subject} />
          <Field label="Date" value={data.sent_date} />
        </FieldGrid>
        <Section title="Body">
          <p className="whitespace-pre-line rounded-xl bg-muted p-4 text-sm leading-relaxed text-foreground">
            {data.body || <span className="italic text-muted-foreground/70">Not extracted</span>}
          </p>
        </Section>
      </>
    );
  }

  if (data.document_type === "INVOICE") {
    return (
      <FieldGrid>
        <Field label="Invoice number" value={data.invoice_number} />
        <Field label="Total amount" value={data.total_amount} />
        <Field label="Invoice date" value={data.invoice_date} />
        <Field label="Due date" value={data.due_date} />
      </FieldGrid>
    );
  }

  if (data.document_type === "BANK_STATEMENT") {
    return (
      <>
        <FieldGrid>
          <Field label="Account number" value={data.account_number} />
          <Field label="Statement period" value={data.statement_period} />
          <Field label="Opening balance" value={data.opening_balance} />
          <Field label="Closing balance" value={data.closing_balance} />
        </FieldGrid>
        <Section title="Transactions">
          <LineList items={data.transactions} />
        </Section>
      </>
    );
  }

  // PRESCRIPTION
  return (
    <>
      <FieldGrid>
        <Field label="Patient name" value={data.patient_name} />
        <Field label="Physician" value={data.physician_name} />
        <Field label="Date" value={data.prescription_date} />
        <Field label="Diagnosis" value={data.diagnosis} />
      </FieldGrid>
      <Section title="Medications">
        <LineList items={data.medications} />
      </Section>
    </>
  );
}
