declare module "react-simple-maps" {
  import type { ComponentType, CSSProperties, ReactNode, SVGProps } from "react";
  import type { GeoProjection } from "d3-geo";

  export interface ComposableMapProps {
    projection?: string | GeoProjection;
    projectionConfig?: Record<string, unknown>;
    width?: number;
    height?: number;
    children?: ReactNode;
  }

  export interface GeographyShape {
    rsmKey: string;
    properties?: Record<string, unknown>;
    [key: string]: unknown;
  }

  export interface GeographiesRenderProps {
    geographies: GeographyShape[];
  }

  export interface GeographiesProps {
    geography: string | Record<string, unknown>;
    children?: (props: GeographiesRenderProps) => ReactNode;
  }

  export interface GeographyProps extends Omit<SVGProps<SVGPathElement>, "ref"> {
    geography: GeographyShape;
    children?: ReactNode;
    style?: {
      default?: CSSProperties;
      hover?: CSSProperties;
      pressed?: CSSProperties;
    };
  }

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const Geographies: ComponentType<GeographiesProps>;
  export const Geography: ComponentType<GeographyProps>;
}
