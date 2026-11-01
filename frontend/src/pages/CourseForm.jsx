import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { errMsg } from "../api/client.js";
import { Button, ErrorAlert, FormField, Loader, PageHeader } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import useFetch from "../hooks/useFetch.js";

const EMPTY = { title: "", description: "", category: "", level: "beginner", duration_hours: 1, price: 0, thumbnail_url: "", is_published: true, instructor: "" };

export default function CourseForm() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const cats = useFetch("/categories/");
  const users = useFetch(user.role === "admin" ? "/auth/users/" : null, { role: "instructor" });
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  useEffect(() => {
    if (!id) return;
    api.get(`/courses/${id}/`).then((r) => setForm({ ...EMPTY, ...r.data, category: r.data.category ?? "" }))
      .catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
  }, [id]);

  const submit = async (e) => {
    e.preventDefault(); setError(""); setSaving(true);
    const body = { ...form, category: form.category || null };
    if (user.role !== "admin" || !body.instructor) delete body.instructor;
    try {
      const r = id ? await api.patch(`/courses/${id}/`, body) : await api.post("/courses/", body);
      navigate(`/courses/${r.data.id}`);
    } catch (err) { setError(errMsg(err)); } finally { setSaving(false); }
  };

  if (loading) return <Loader />;
  return (
    <>
      <PageHeader title={id ? "Edit course" : "New course"} />
      <form className="card pad form-narrow" onSubmit={submit}>
        <ErrorAlert message={error} />
        <FormField label="Title"><input required value={form.title} onChange={set("title")} /></FormField>
        <FormField label="Description"><textarea required rows={5} value={form.description} onChange={set("description")} /></FormField>
        <div className="grid-2">
          <FormField label="Category">
            <select value={form.category} onChange={set("category")}>
              <option value="">- none -</option>
              {(cats.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
          <FormField label="Level">
            <select value={form.level} onChange={set("level")}>
              <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
            </select>
          </FormField>
          <FormField label="Duration (hours)"><input type="number" min="1" value={form.duration_hours} onChange={set("duration_hours")} /></FormField>
          <FormField label="Price ($)"><input type="number" min="0" step="0.01" value={form.price} onChange={set("price")} /></FormField>
        </div>
        {user.role === "admin" && (
          <FormField label="Instructor">
            <select required={!id} value={form.instructor} onChange={set("instructor")}>
              <option value="">- select -</option>
              {(users.data || []).map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
            </select>
          </FormField>
        )}
        <FormField label="Thumbnail URL"><input type="url" value={form.thumbnail_url} onChange={set("thumbnail_url")} /></FormField>
        <label className="check"><input type="checkbox" checked={form.is_published} onChange={set("is_published")} /> Published</label>
        <Button loading={saving} type="submit">{id ? "Save changes" : "Create course"}</Button>
      </form>
    </>
  );
}
