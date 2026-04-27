import Link from "next/link";
import type { DbCourse } from "@/types";

interface Props {
  course: DbCourse;
}

export default function CourseCard({ course }: Props) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      style={{
        display: "block",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        overflow: "hidden",
        textDecoration: "none",
        transition: "border-color 0.15s, transform 0.15s",
      }}
      className="group hover:-translate-y-0.5"
    >
      {/* Cover image */}
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
          <div style={{ width: "100%", height: "100%", background: "var(--surface3)" }} />
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
            textTransform: "uppercase",
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
          <p style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 8 }}>
            {course.instructor}
          </p>
        )}
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
          {course.price.toLocaleString("is-IS")} kr.
        </p>
      </div>
    </Link>
  );
}
