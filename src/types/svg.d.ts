// SVGs are imported as React components through @svgr/webpack (see next.config.ts).
declare module "*.svg" {
  import type * as React from "react";

  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;

  export default ReactComponent;
}
