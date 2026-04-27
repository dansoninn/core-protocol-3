import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface DbCourse {
  id: string;
  title: string;
  slug: string;
  category: string;
  price: number;
  cover_image: string | null;
  instructor: string | null;
}

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("courses")
    .select("id, title, slug, category, price, cover_image, instructor")
    .order("created_at", { ascending: false });

  if (error) console.error("[CoursesPage] Supabase error:", error.message);

  const courses = (data as DbCourse[]) ?? [];

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <main
        style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 20px 80px" }}
        className="sm:px-6 lg:px-8"
      >
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: 42,
              color: "var(--text)",
              letterSpacing: "0.04em",
              lineHeight: 1,
              marginBottom: 6,
            }}
          >
            Námskeið
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted2)" }}>
            {courses.length > 0
              ? `${courses.length} námskeið í boði`
              : "Engin námskeið í boði eins og er."}
          </p>
        </div>

        {courses.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.slug}`}
                style={{
                  display: "block",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  overflow: "hidden",
                  textDecoration: "none",
                  transition: "transform 0.15s",
                }}
                className="group hover:-translate-y-0.5"
              >
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: 180,
                    background: "var(--surface2)",
                    overflow: "hidden",
                  }}
                >
                  {course.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.cover_image}
                      alt={course.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transition: "transform 0.3s",
                      }}
                      className="group-hover:scale-105"
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background: "var(--surface3)",
                      }}
                    />
                  )}
                  <span
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--muted2)",
                      background: "rgba(10,12,15,0.7)",
                      backdropFilter: "blur(6px)",
                      padding: "3px 8px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.08)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase" as const,
                    }}
                  >
                    {course.category}
                  </span>
                </div>
                <div style={{ padding: "14px 16px" }}>
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--text)",
                      lineHeight: 1.35,
                      marginBottom: 4,
                    }}
                  >
                    {course.title}
                  </h3>
                  {course.instructor && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--muted2)",
                        marginBottom: 8,
                      }}
                    >
                      {course.instructor}
                    </p>
                  )}
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text)",
                    }}
                  >
                    {course.price.toLocaleString("is-IS")} kr.
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
