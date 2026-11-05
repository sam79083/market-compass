import type { CSSProperties } from "react";
import type { LocaleKey } from "../i18n";
import { LOCALE_TEXT } from "../i18n";
import type { Category } from "../types";
import { formatCoverage, formatScore, hexToRgba } from "../utils";

interface CategoryStripProps {
  categories: Category[];
  locale?: LocaleKey;
}

export function CategoryStrip({ categories, locale = "en" }: CategoryStripProps) {
  const text = LOCALE_TEXT[locale];
  return (
    <section
      className="category-grid"
      aria-label={locale === "kr" ? "카테고리 점수" : "Category scores"}
    >
      {categories.map((category) => {
        const components = Object.values(category.components);
        const available = components.filter((component) => component.available).length;
        const label =
          text.category_labels[category.key as keyof typeof text.category_labels] ??
          category.label;
        const description =
          text.category_descriptions[
            category.key as keyof typeof text.category_descriptions
          ] ?? category.description;
        const classificationKey =
          LOCALE_TEXT.en.classification_from_en[category.classification] ??
          category.classification_key;
        const classification =
          text.band_labels[classificationKey as keyof typeof text.band_labels] ??
          category.classification;
        return (
          <article
            className="category-card"
            key={category.key}
            style={{ "--category-color": category.color } as CSSProperties}
          >
            <div className="category-head">
              <span className="category-name">{label}</span>
              <span className="category-weight">{Math.round(category.weight * 100)}%</span>
            </div>
            <div className="category-main">
              <span className="category-score" style={{ color: category.color }}>
                {formatScore(category.score)}
              </span>
              <span className="category-classification">{classification}</span>
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
              <span>{text.coverage_label} {formatCoverage(category.coverage)}</span>
              <span>{text.signals_count(available)}</span>
            </div>
            <p className="category-description">{description}</p>
          </article>
        );
      })}
    </section>
  );
}
