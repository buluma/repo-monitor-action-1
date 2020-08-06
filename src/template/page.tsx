import * as React from "react";
import * as ReactDOM from "react-dom/server";
import { CanvasRenderService } from "chartjs-node-canvas";
import * as dayjs from "dayjs";
import * as localizedFormat from "dayjs/plugin/localizedFormat";
import {
  ReleaseYear,
  MetricsData,
  ReleaseMap,
  Config,
  MetricsContext,
  MetricConfig,
} from "../model";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Releases } from "./components/Releases";
import { Metrics } from "./components/Metrics";
import { Page } from "./components/layout/Page";
import { generateLineChart } from "./visualizations/line";
import { importConfig } from "./config/importer";

dayjs.extend(localizedFormat);

export const generatePage = async (
  releases: ReleaseYear,
  data: Array<MetricsData>,
  context: MetricsContext
) => {
  const releasesMap = new Map<string, number>();
  releases.releases
    .sort((a, b) => b.timestamp - a.timestamp)
    .forEach((r, i) => releasesMap.set(r.id, releases.releases.length - i));
  const config = await importConfig(context);
  const graphics = await generateGraphics(data, config, releasesMap);
  return `<!DOCTYPE html>
<html>
  <head>
    <title>${context.owner}/${context.repo} | Metrics</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/tailwindcss@1.6.0/dist/tailwind.min.css"
      integrity="sha256-Y4vGjLmrpriLD3X1h1YdyzE2icdiBsJHBXORYXlyDwM="
      crossorigin="anonymous"
    />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@5.14.0/css/all.css"
      integrity="sha256-HmKKK3VimMDCOGPTx1mp/5Iaip6BWMZy5HMhLc+4o9E="
      crossorigin="anonymous"
    />
  </head>
  <body>
    ${ReactDOM.renderToStaticMarkup(
      <Page>
        <Header year={releases} repo={context.repo} owner={context.owner} />
        <Releases year={releases} releasesMap={releasesMap} />
        <Metrics config={config} graphics={graphics} />
        <Footer />
      </Page>
    )}
  </body>
</html>`;
};

export const generateGraphics = async (
  data: Array<MetricsData>,
  config: Config,
  releasesMap: ReleaseMap
): Promise<
  Map<string, { img: string; config: MetricConfig; data: MetricsData }>
> => {
  const hiddenKeys = Object.entries(config.metrics)
    .filter(([_, v]) => v.hidden)
    .map(([k]) => k);

  const allMetrics = await Promise.all(
    data
      .filter((d) => !hiddenKeys.find((x) => x == d.key))
      .map(async (data) => {
        const configForKey = config.metrics[data.key];
        const img = await renderImage(data, releasesMap);
        return {
          data,
          img,
          config: configForKey,
        };
      })
  );

  const resultMap = new Map();
  allMetrics.forEach((m) => {
    resultMap.set(m.data.key, m);
  });
  return resultMap;
};

const renderImage = async (data: MetricsData, releasesMap: ReleaseMap) => {
  const canvasRenderService = new CanvasRenderService(300, 300);
  const buffer = await canvasRenderService.renderToBuffer(
    generateLineChart(data, releasesMap)
  );
  return buffer.toString("base64");
};
