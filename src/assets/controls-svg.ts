export default `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="250px" height="200px" viewBox="0 0 250 200" fill="transparent" focusable="false" aria-hidden="true">
  <!-- Rotation arc -->
  <path id="orbit"
        d="M50,75 C55,50 195,50 200,75 C195,100 55,100 50,75"
        stroke-linecap="round"
        stroke-dasharray="180 180"
        stroke-dashoffset="-40"
        stroke="#a1a1a1"
        stroke-width="7"
        fill="transparent">
    <animate attributeName="stroke-dashoffset"
           dur="1.75s"
           calcMode="linear"
           values="-40;-40.56;-42.08;-44.32;-47.04;-50;-52.96;-55.68;-57.92;-59.44;-60;-59.44;-57.92;-55.68;-52.96;-50;-47.04;-44.32;-42.08;-40.56;-40"
           keyTimes="0;0.05;0.1;0.15;0.2;0.25;0.3;0.35;0.4;0.45;0.5;0.55;0.6;0.65;0.7;0.75;0.8;0.85;0.9;0.95;1"
           repeatCount="indefinite" />
  </path>

  <path d="M50,75 C55,50 195,50 200,75 C195,100 55,100 50,75"
        opacity="1"
        stroke-linecap="round"
        stroke-dasharray="140 220"
        stroke-dashoffset="-225"
        stroke="white"
        stroke-width="7"
        fill="transparent">
    <animate attributeName="stroke-dashoffset"
           dur="1.75s"
           calcMode="linear"
           values="-225;-225.56;-227.07999999999998;-229.32;-232.04;-235;-237.96;-240.68;-242.92;-244.44;-245;-244.44;-242.92;-240.68;-237.96;-235;-232.04;-229.32;-227.07999999999998;-225.56;-225"
           keyTimes="0;0.05;0.1;0.15;0.2;0.25;0.3;0.35;0.4;0.45;0.5;0.55;0.6;0.65;0.7;0.75;0.8;0.85;0.9;0.95;1"
           repeatCount="indefinite" />
  </path>

  <!-- Hand Icon -->
  <defs>
    <path id="a" d="M0 0h24v24H0V0z"/>
  </defs>
  <clipPath id="b">
    <use xlink:href="#a" overflow="visible"/>
  </clipPath>

  <g transform="translate(100, 70) scale(3.5)">
    <g transform="translate(0, 0)">
      <animateTransform
         attributeName="transform"
         type="translate"
         repeatCount="indefinite"
         keyTimes="0;0.05;0.1;0.15;0.2;0.25;0.3;0.35;0.4;0.45;0.5;0.55;0.6;0.65;0.7;0.75;0.8;0.85;0.9;0.95;1"
         values="0,0;-0.16800000000000015,0;-0.6239999999999988,0;-1.2960000000000003,0;-2.111999999999999,0;-3,0;-3.8879999999999995,0;-4.704,0;-5.3759999999999994,0;-5.832,0;-6,0;-5.832,0;-5.3759999999999994,0;-4.704,0;-3.8879999999999995,0;-3,0;-2.111999999999999,0;-1.2960000000000003,0;-0.6239999999999988,0;-0.16800000000000015,0;0,0"
         dur="1.75s" />
      <path clip-path="url(#b)"
            fill="white"
            d="M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z"/>
    </g>
  </g>

  <path id="orbit-hidden"
          d="M-30,15 C-35,-10 115,-10 120,15 C115,40 -35,40 -30,15"
          stroke-width="0"
          fill="transparent"></path>
  
  <!-- Arrow -->
  <g transform="translate(80, 60)">
    <polyline id="Path-3" stroke="#a1a1a1" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" transform="translate(-33.952293, -4) rotate(-39.000000)" points="35.5366949 39.6822958 26.6550872 26.0761929 41.2494988 29.5432078">
      <animateMotion
          calcMode="linear"
          keyPoints="0.095;0.09668;0.10124;0.10796;0.11612;0.125;0.13388;0.14204;0.14876;0.15332;0.155;0.15332;0.14876;0.14204;0.13388;0.125;0.11612;0.10796;0.10124;0.09668;0.095"
          keyTimes="0;0.05;0.1;0.15;0.2;0.25;0.3;0.35;0.4;0.45;0.5;0.55;0.6;0.65;0.7;0.75;0.8;0.85;0.9;0.95;1"
          dur="1.75s"
          repeatCount="indefinite">
        <mpath xlink:href="#orbit-hidden"/>
      </animateMotion>
    </polyline>
  </g>
</svg>`;
