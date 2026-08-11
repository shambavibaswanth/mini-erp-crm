import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { customerApi, Customer } from "../../api/endpoints";
import { getErrorMessage } from "../../api/client";
import { StatusChip } from "../../components/StatusChip";
import { useAuth } from "../../context/AuthContext";
import { CustomerFormModal } from "./CustomerFormModal";

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [note, setNote] = useState("");
  const [noteDate, setNoteDate] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === "ADMIN" || user?.role === "SALES";

  async function load() {
    if (!id) return;
    try {
      const res = await customerApi.get(id);
      setCustomer(res.data.customer);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!id || !note.trim()) return;
    setAddingNote(true);
    try {
      await customerApi.addFollowUp(id, note, noteDate || undefined);
      setNote("");
      setNoteDate("");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setAddingNote(false);
    }
  }

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!customer) return <p style={{ color: "var(--color-muted)" }}>Loading…</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">
            <Link to="/customers">Customers</Link> / {customer.name}
          </div>
          <h1>{customer.name}</h1>
        </div>
        {canManage && (
          <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>
            Edit
          </button>
        )}
      </div>

      <div className="stat-grid">
        <div className="card card-pad">
          <div className="stat-label">Status</div>
          <StatusChip status={customer.status} />
        </div>
        <div className="card card-pad">
          <div className="stat-label">Type</div>
          <div>{customer.customerType}</div>
        </div>
        <div className="card card-pad">
          <div className="stat-label">Mobile</div>
          <div className="mono">{customer.mobile}</div>
        </div>
        <div className="card card-pad">
          <div className="stat-label">Next follow-up</div>
          <div>{customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : "Not scheduled"}</div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-title" style={{ marginTop: 0 }}>
          Details
        </div>
        <p><strong>Business:</strong> {customer.businessName || "—"}</p>
        <p><strong>Email:</strong> {customer.email || "—"}</p>
        <p><strong>GST number:</strong> {customer.gstNumber || "—"}</p>
        <p><strong>Address:</strong> {customer.address || "—"}</p>
        {customer.notes && <p><strong>Notes:</strong> {customer.notes}</p>}
      </div>

      <div className="section-title">Follow-up log</div>
      <div className="card card-pad">
        {canManage && (
          <form onSubmit={handleAddNote} style={{ marginBottom: 16 }}>
            <div className="field">
              <label>Add a follow-up note</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Called customer, discussed reorder…" required />
            </div>
            <div className="form-grid" style={{ alignItems: "end" }}>
              <div className="field">
                <label>Next follow-up date (optional)</label>
                <input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} />
              </div>
              <div className="field">
                <button type="submit" className="btn btn-primary" disabled={addingNote}>
                  {addingNote ? "Saving…" : "Add note"}
                </button>
              </div>
            </div>
          </form>
        )}

        {!customer.followUps || customer.followUps.length === 0 ? (
          <div className="empty-state">
            <h3>No follow-ups logged yet</h3>
          </div>
        ) : (
          <div>
            {customer.followUps.map((f) => (
              <div key={f.id} style={{ borderBottom: "1px solid var(--color-border)", padding: "10px 0" }}>
                <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
                  {new Date(f.createdAt).toLocaleString()} · {f.createdBy?.name}
                  {f.followUpDate && ` · next: ${new Date(f.followUpDate).toLocaleDateString()}`}
                </div>
                <div>{f.note}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section-title">Recent challans</div>
      <div className="card">
        {!customer.challans || customer.challans.length === 0 ? (
          <div className="empty-state">
            <h3>No sales challans yet</h3>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Status</th>
                  <th>Total qty</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {customer.challans.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/challans/${c.id}`)}>
                    <td className="mono">{c.challanNumber}</td>
                    <td>
                      <StatusChip status={c.status} />
                    </td>
                    <td>{c.totalQuantity}</td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showEdit && (
        <CustomerFormModal
          customer={customer}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            load();
          }}
        />
      )}
    </div>
  );
}
