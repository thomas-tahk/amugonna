import { BrandIcon } from './icons';

export default function Brand() {
  return <h1 className="brand">
    <BrandIcon width={26} height={26} />
    <span className="brand-wordmark">
      <span>Amugonna</span>
      <span className="brand-korean" lang="ko">아무거나</span>
    </span>
  </h1>;
}
