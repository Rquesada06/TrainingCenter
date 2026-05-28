// Type declarations for CSS module imports used in .web.tsx files
declare module '*.module.css' {
  const styles: { [className: string]: string };
  export default styles;
}
