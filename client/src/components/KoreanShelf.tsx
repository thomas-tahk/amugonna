import React from 'react';
import { KOREAN_SOURCES } from '../data/koreanSources';
import './KoreanShelf.css';

export type KoreanSource = (typeof KOREAN_SOURCES)[number];

interface Props {
  onPreview: (source: KoreanSource) => void;
}

const KoreanShelf: React.FC<Props> = ({ onPreview }) => (
  <section className="korean-shelf" aria-labelledby="korean-shelf-heading">
    <div className="korean-shelf-intro">
      <h2 id="korean-shelf-heading">Korean shelf</h2>
      <p>Curated links to specific recipes and versions from Korean Bapsang · Hyosun.</p>
      <p className="korean-shelf-review-note">
        Source links aren’t filtered by your exclusions. Review the ingredients before saving a private copy.
      </p>
    </div>
    <ul className="korean-shelf-list">
      {KOREAN_SOURCES.map(source => <li key={source.path}>
        <article className="korean-shelf-card">
          <div className="korean-shelf-title">
            <div><h3>{source.title}</h3><p lang="ko" className="korean-subtitle">{source.korean}</p></div>
            <span className="korean-shelf-category">{source.category}</span>
          </div>
          <p className="korean-shelf-source">{source.source}</p>
          <p className="korean-shelf-version">{source.note}</p>
          <div className="korean-shelf-actions">
            <a href={source.url} target="_blank" rel="noreferrer">View source</a>
            <button type="button" onClick={() => onPreview(source)}>Preview import {source.title}</button>
          </div>
        </article>
      </li>)}
    </ul>
  </section>
);

export default KoreanShelf;
