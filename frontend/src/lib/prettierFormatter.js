/** Browser-side Prettier with explicit plugins, as required by standalone API. */
import * as prettier from "prettier/standalone";
import * as babel from "prettier/plugins/babel";
import * as acorn from "prettier/plugins/acorn";
import * as estree from "prettier/plugins/estree";
import * as flow from "prettier/plugins/flow";
import * as glimmer from "prettier/plugins/glimmer";
import * as typescript from "prettier/plugins/typescript";
import * as meriyah from "prettier/plugins/meriyah";
import * as postcss from "prettier/plugins/postcss";
import * as html from "prettier/plugins/html";
import * as markdown from "prettier/plugins/markdown";
import * as yaml from "prettier/plugins/yaml";
import * as graphql from "prettier/plugins/graphql";

const plugins = [
  acorn, babel, estree, flow, glimmer, graphql, html, markdown,
  meriyah, postcss, typescript, yaml,
];

export async function formatSource(source, parser, options = {}) {
  if (!parser) return source;
  return prettier.format(source, { parser, plugins, printWidth: 100, tabWidth: 2, semi: true, singleQuote: false, ...options });
}
