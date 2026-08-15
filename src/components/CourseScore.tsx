import { COURSE_SCORES, formatWon } from "@/lib/business";

export function CourseScore({ compact = false }: { compact?: boolean }) {
  const courses = [...new Set(COURSE_SCORES.map((item) => item.course))];
  return (
    <div className={compact ? "score-table score-table-compact" : "score-table"}>
      {courses.map((course, index) => (
        <section className="score-row" key={course}>
          <div className="score-title">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{course}</h3>
          </div>
          <div className="score-options">
            {COURSE_SCORES.filter((item) => item.course === course).map((item) => (
              <div key={`${course}-${item.minutes}`}>
                <b>{`${item.minutes}분`}</b>
                <span>{formatWon(item.price)}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
