import { FormEvent, useState } from "react";
import { customerApi, Customer, CustomerType, CustomerStatus } from "../../api/endpoints";
import { getErrorMessage } from "../../api/client";

interface Props {
  customer?: Customer;
  onClose: () => void;
  onSaved: () => void;
}

export function CustomerFormModal({ customer, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: customer?.name || "",
    mobile: customer?.mobile || "",
    email: customer?.email || "",
    businessName: customer?.businessName || "",
    gstNumber: customer?.gstNumber || "",
    customerType: (customer?.customerType || "RETAIL") as CustomerType,
    status: (customer?.status || "LEAD") as CustomerStatus,
    address: customer?.address || "",
    followUpDate: customer?.followUpDate ? customer.followUpDate.slice(0, 10) : "",
    notes: customer?.notes || "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = { ...form, followUpDate: form.followUpDate || undefined };
      if (customer) {
        await customerApi.update(customer.id, payload);
      } else {
        await customerApi.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginBottom: 16 }}>{customer ? "Edit customer" : "Add customer"}</h2>
        {error && <div className="banner banner-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Customer name</label>
              <input value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div className="field">
              <label>Mobile number</label>
              <input value={form.mobile} onChange={(e) => update("mobile", e.target.value)} required />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div className="field">
              <label>Business name</label>
              <input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} />
            </div>
            <div className="field">
              <label>GST number (optional)</label>
              <input value={form.gstNumber} onChange={(e) => update("gstNumber", e.target.value)} />
            </div>
            <div className="field">
              <label>Customer type</label>
              <select value={form.customerType} onChange={(e) => update("customerType", e.target.value as CustomerType)}>
                <option value="RETAIL">Retail</option>
                <option value="WHOLESALE">Wholesale</option>
                <option value="DISTRIBUTOR">Distributor</option>
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => update("status", e.target.value as CustomerStatus)}>
                <option value="LEAD">Lead</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div className="field">
              <label>Next follow-up date</label>
              <input type="date" value={form.followUpDate} onChange={(e) => update("followUpDate", e.target.value)} />
            </div>
            <div className="field field-full">
              <label>Address</label>
              <input value={form.address} onChange={(e) => update("address", e.target.value)} />
            </div>
            <div className="field field-full">
              <label>Notes</label>
              <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
