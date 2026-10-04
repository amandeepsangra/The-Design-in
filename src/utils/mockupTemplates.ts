// Built-in photorealistic mockup templates (Vector SVG encoded as data URLs)
// Allows offline, instant mockup generation without external network requests

export interface BuiltinMockup {
  id: string;
  name: string;
  category: 'mug' | 'apparel' | 'bag';
  url: string;
  defaultScale: number;
  defaultOffsetX: number;
  defaultOffsetY: number;
  defaultBlendMode: 'multiply' | 'normal' | 'screen' | 'overlay';
}

// 1. Ceramic Coffee Mug (Front / Wrap View)
const mugFrontSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <defs>
    <!-- Background Vignette -->
    <radialGradient id="bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="85%" stop-color="#f5f7fa"/>
      <stop offset="100%" stop-color="#e8ecf2"/>
    </radialGradient>

    <!-- Mug Ceramic Cylindrical Gradient -->
    <linearGradient id="mugBody" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e0e3e8"/>
      <stop offset="12%" stop-color="#f4f6f9"/>
      <stop offset="35%" stop-color="#ffffff"/>
      <stop offset="70%" stop-color="#ffffff"/>
      <stop offset="90%" stop-color="#e4e7ed"/>
      <stop offset="100%" stop-color="#c8cdd6"/>
    </linearGradient>

    <!-- Handle Gradient -->
    <linearGradient id="handleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#d0d5de"/>
      <stop offset="40%" stop-color="#f7f9fb"/>
      <stop offset="85%" stop-color="#e1e5ec"/>
      <stop offset="100%" stop-color="#b0b7c4"/>
    </linearGradient>

    <!-- Inner Rim Gradient -->
    <linearGradient id="innerRim" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#8e96a4"/>
      <stop offset="40%" stop-color="#bec5d1"/>
      <stop offset="100%" stop-color="#e2e7ef"/>
    </linearGradient>

    <!-- Gloss Specular Highlight -->
    <linearGradient id="specular" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(255,255,255,0)"/>
      <stop offset="30%" stop-color="rgba(255,255,255,0.7)"/>
      <stop offset="45%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>

    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="25" stdDeviation="30" flood-color="rgba(30,40,60,0.18)"/>
    </filter>
  </defs>

  <rect width="1000" height="1000" fill="url(#bg)"/>

  <!-- Table surface shadow -->
  <ellipse cx="500" cy="790" rx="320" ry="45" fill="rgba(20,30,50,0.12)" filter="url(#shadow)"/>
  <ellipse cx="500" cy="780" rx="250" ry="25" fill="rgba(10,20,40,0.2)"/>

  <!-- Mug Handle (Right side) -->
  <g filter="url(#shadow)">
    <path d="M 640 370 C 820 370 850 490 850 560 C 850 640 800 700 640 700 L 630 650 C 740 650 780 610 780 560 C 780 510 750 430 630 430 Z" fill="url(#handleGrad)" stroke="#c4c9d4" stroke-width="2"/>
    <path d="M 640 430 C 750 430 780 510 780 560 C 780 610 740 650 630 650" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="6"/>
  </g>

  <!-- Mug Body -->
  <g filter="url(#shadow)">
    <path d="M 280 270 L 280 720 C 280 770 720 770 720 720 L 720 270 Z" fill="url(#mugBody)"/>
    <!-- Specular highlight streak -->
    <path d="M 380 275 L 380 735 C 410 740 430 740 460 738 L 460 275 Z" fill="url(#specular)"/>
  </g>

  <!-- Mug Inner Well & Top Rim -->
  <ellipse cx="500" cy="270" rx="220" ry="38" fill="url(#innerRim)"/>
  <ellipse cx="500" cy="272" rx="212" ry="32" fill="#505663"/>
  <ellipse cx="500" cy="278" rx="205" ry="26" fill="#2d323c"/>
  
  <!-- Gloss on Outer Rim -->
  <ellipse cx="500" cy="270" rx="220" ry="38" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.9"/>
  <ellipse cx="500" cy="270" rx="220" ry="38" fill="none" stroke="#d5dae3" stroke-width="1.5"/>

  <!-- Mug Base Curved Contour -->
  <path d="M 280 720 C 350 765 650 765 720 720" fill="none" stroke="#b8beca" stroke-width="2.5"/>
</svg>`;

// 2. White Ceramic Mug with Inner Color
const mugSideSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <defs>
    <radialGradient id="bg2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#edf1f7"/>
    </radialGradient>
    <linearGradient id="bodyGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ccd2de"/>
      <stop offset="15%" stop-color="#f4f6fa"/>
      <stop offset="45%" stop-color="#ffffff"/>
      <stop offset="80%" stop-color="#f0f3f8"/>
      <stop offset="100%" stop-color="#cfd5e0"/>
    </linearGradient>
    <linearGradient id="handleGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#b5bdcc"/>
      <stop offset="50%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#c5cdd9"/>
    </linearGradient>
    <filter id="shadow2" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="28" stdDeviation="32" flood-color="rgba(25,35,55,0.16)"/>
    </filter>
  </defs>

  <rect width="1000" height="1000" fill="url(#bg2)"/>
  <ellipse cx="500" cy="800" rx="300" ry="40" fill="rgba(15,25,45,0.12)" filter="url(#shadow2)"/>
  <ellipse cx="500" cy="790" rx="230" ry="20" fill="rgba(10,20,35,0.18)"/>

  <!-- Left Handle View -->
  <g filter="url(#shadow2)">
    <path d="M 360 380 C 180 380 150 500 150 570 C 150 650 200 710 360 710 L 370 660 C 260 660 220 620 220 570 C 220 520 250 440 370 440 Z" fill="url(#handleGrad2)" stroke="#bcc3cf" stroke-width="2"/>
    <path d="M 360 440 C 250 440 220 520 220 570 C 220 620 260 660 370 660" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="6"/>
  </g>

  <!-- Body -->
  <g filter="url(#shadow2)">
    <path d="M 280 290 L 280 730 C 280 780 720 780 720 730 L 720 290 Z" fill="url(#bodyGrad2)"/>
  </g>

  <!-- Top Rim -->
  <ellipse cx="500" cy="290" rx="220" ry="35" fill="#c0c7d4"/>
  <ellipse cx="500" cy="292" rx="212" ry="29" fill="#2b313d"/>
  <ellipse cx="500" cy="290" rx="220" ry="35" fill="none" stroke="#ffffff" stroke-width="4"/>
  <path d="M 280 730 C 350 775 650 775 720 730" fill="none" stroke="#bcc3ce" stroke-width="2"/>
</svg>`;

// 3. Classic White T-Shirt
const tshirtSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <defs>
    <radialGradient id="bg3" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f0f3f7"/>
    </radialGradient>
    <linearGradient id="tshirtShade" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#d6dbe4"/>
      <stop offset="18%" stop-color="#f3f5f8"/>
      <stop offset="50%" stop-color="#ffffff"/>
      <stop offset="82%" stop-color="#f1f4f8"/>
      <stop offset="100%" stop-color="#d3d8e2"/>
    </linearGradient>
    <filter id="shadow3" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="20" stdDeviation="28" flood-color="rgba(30,40,60,0.14)"/>
    </filter>
  </defs>

  <rect width="1000" height="1000" fill="url(#bg3)"/>

  <!-- T-Shirt Body -->
  <g filter="url(#shadow3)">
    <path d="M 370 180 C 420 220 580 220 630 180 L 760 250 L 700 370 L 630 330 L 640 820 C 640 840 620 850 600 850 L 400 850 C 380 850 360 840 360 820 L 370 330 L 300 370 L 240 250 Z" 
          fill="url(#tshirtShade)" stroke="#c4cbd7" stroke-width="2"/>
    <!-- Collar Band -->
    <path d="M 370 180 C 420 230 580 230 630 180 C 590 205 410 205 370 180 Z" fill="#e2e7f0" stroke="#b5becd" stroke-width="2"/>
    <!-- Fold Shadows -->
    <path d="M 380 340 Q 430 460 410 600" fill="none" stroke="rgba(160,175,195,0.22)" stroke-width="14" stroke-linecap="round"/>
    <path d="M 620 340 Q 570 460 590 600" fill="none" stroke="rgba(160,175,195,0.22)" stroke-width="14" stroke-linecap="round"/>
    <path d="M 480 300 Q 500 500 490 750" fill="none" stroke="rgba(160,175,195,0.12)" stroke-width="20" stroke-linecap="round"/>
  </g>
</svg>`;

// 4. Canvas Tote Bag
const toteBagSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <defs>
    <radialGradient id="bg4" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f3f4f6"/>
    </radialGradient>
    <linearGradient id="canvasTexture" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e0d7c7"/>
      <stop offset="15%" stop-color="#f5efe4"/>
      <stop offset="50%" stop-color="#faf6ee"/>
      <stop offset="85%" stop-color="#f3ede1"/>
      <stop offset="100%" stop-color="#dfd6c5"/>
    </linearGradient>
    <filter id="shadow4" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="24" stdDeviation="30" flood-color="rgba(40,35,25,0.16)"/>
    </filter>
  </defs>

  <rect width="1000" height="1000" fill="url(#bg4)"/>

  <!-- Straps -->
  <g filter="url(#shadow4)">
    <path d="M 400 370 C 400 130 600 130 600 370" fill="none" stroke="#d4c9b6" stroke-width="32" stroke-linecap="square"/>
    <path d="M 400 370 C 400 130 600 130 600 370" fill="none" stroke="#ece4d4" stroke-width="24" stroke-linecap="square"/>
  </g>

  <!-- Bag Body -->
  <g filter="url(#shadow4)">
    <path d="M 310 370 L 690 370 L 670 850 C 670 870 650 880 630 880 L 370 880 C 350 880 330 870 330 850 Z" 
          fill="url(#canvasTexture)" stroke="#cdbfac" stroke-width="2"/>
    <!-- Fold Texture -->
    <path d="M 350 400 Q 370 600 360 830" fill="none" stroke="rgba(150,135,115,0.15)" stroke-width="12" stroke-linecap="round"/>
    <path d="M 650 400 Q 630 600 640 830" fill="none" stroke="rgba(150,135,115,0.15)" stroke-width="12" stroke-linecap="round"/>
    <line x1="310" y1="370" x2="690" y2="370" stroke="#bdae99" stroke-width="4"/>
  </g>
</svg>`;

const toDataUrl = (svgString: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;

export const BUILTIN_MOCKUPS: BuiltinMockup[] = [
  {
    id: 'builtin_mug_front',
    name: 'Ceramic Mug (Front)',
    category: 'mug',
    url: toDataUrl(mugFrontSvg),
    defaultScale: 0.52,
    defaultOffsetX: 0,
    defaultOffsetY: 9,
    defaultBlendMode: 'multiply',
  },
  {
    id: 'builtin_mug_side',
    name: 'Coffee Mug (Side Handle)',
    category: 'mug',
    url: toDataUrl(mugSideSvg),
    defaultScale: 0.50,
    defaultOffsetX: 2,
    defaultOffsetY: 10,
    defaultBlendMode: 'multiply',
  },
  {
    id: 'builtin_tshirt',
    name: 'White T-Shirt (Chest)',
    category: 'apparel',
    url: toDataUrl(tshirtSvg),
    defaultScale: 0.38,
    defaultOffsetX: 0,
    defaultOffsetY: -3,
    defaultBlendMode: 'multiply',
  },
  {
    id: 'builtin_tote',
    name: 'Canvas Tote Bag',
    category: 'bag',
    url: toDataUrl(toteBagSvg),
    defaultScale: 0.42,
    defaultOffsetX: 0,
    defaultOffsetY: 14,
    defaultBlendMode: 'multiply',
  },
];
