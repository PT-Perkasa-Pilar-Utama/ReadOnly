const paths = {
  search: 'm21 21-4.4-4.4M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  back: 'M20 12H4m6-6-6 6 6 6',
  logout: 'M9 4H4v16h5m5-13 5 5-5 5M8 12h12',
  close: 'm6 6 12 12M6 18 18 6',
  filter: 'M4 5h16M7 12h10m-7 7h4',
  chevron: 'm9 5 7 7-7 7',
  edit: 'm15 4 5 5M4 20l5-1L21 7l-5-5L4 15v5Z',
  plus: 'M12 5v14M5 12h14',
  book: 'M12 6v15M3 3c4 0 7 1 9 3 2-2 5-3 9-3v15c-4 0-7 1-9 3-2-2-5-3-9-3V3Z',
  check: 'm5 12 4 4L19 6',
  eye: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  warning: 'M12 3 1 21h22L12 3Zm0 6v5m0 3v1',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3a4 4 0 0 1 0 8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
} as const;
export default function Icon(props: {
  name: keyof typeof paths;
  size?: number;
}) {
  return (
    <svg
      width={props.size ?? 20}
      height={props.size ?? 20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={paths[props.name]} />
    </svg>
  );
}
