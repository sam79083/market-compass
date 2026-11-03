import type { CSSProperties } from "react";
import type { Category } from "../types";
import { formatCoverage, formatScore, hexToRgba } from "../utils";

interface CategoryStripProps {
  categories: Category[];
}

export function CategoryStrip({ categories }: CategoryStripProps) {
  return (
    <section className="category-grid" aria-label="Category scores">
      {categories.map((category) => {
        const components = Object.values(category.components);
        const available = components.filter((component) => component.available).length;
        return (
          <article
            className="category-card"
            key={category.key}
            style={{ "--category-color": category.color } as CSSProperties}
          >
            <div className="category-head">
              <span className="category-name">{category.label}</span>
              <span className="category-weight">{Math.round(category.weight * 100)}%</span>
            </div>
            <div className="category-main">
              <span className="category-score" style={{ color: category.color }}>
                {formatScore(category.score)}
              </span>
              <span className="category-classification">{category.classification}</span>
            </div>
            <div className="category-bar">
              <span
                style={{
                  width: `${category.score ?? 0}%`,
                  background: `linear-gradient(90deg, ${hexToRgba(category.color, 0.35)}, ${category.color})`,
                }}
              />
            </div>
            <div className="category-foot">
              <span>Coverage {formatCoverage(category.coverage)}</span>
              <span>
                {available}/{components.length} signals
              </span>
            </div>
            <p className="category-description">{category.description}</p>
          </article>
        );
      })}
    </section>
  );
}
