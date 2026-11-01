import { useEffect, useState } from "react";
import { CourseCard, Empty, ErrorAlert, Loader, PageHeader } from "../components/ui.jsx";
import useFetch from "../hooks/useFetch.js";

export default function Courses() {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const cats = useFetch("/categories/");

  useEffect(() => { const t = setTimeout(() => setQ(search), 300); return () => clearTimeout(t); }, [search]); 
  const { data, loading, error, reload } = useFetch("/courses/", { search: q, category, level });

  return (
    <>
      <PageHeader title="Browse courses" />
      <div className="filters">
        <input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {(cats.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="">All levels</option>
          <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
        </select>
      </div>
      <ErrorAlert message={error} onRetry={reload} />
      {loading ? <Loader /> : data?.length ? (
        <div className="grid-cards">{data.map((c) => <CourseCard key={c.id} course={c} />)}</div>
      ) : !error && <Empty>No courses found.</Empty>}
    </>
  );
}
