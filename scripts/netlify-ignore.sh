#!/usr/bin/env bash
# Netlify : code de sortie 0 = construction annulée, 1 = construction lancée.
# Les aperçus et les déploiements de branche sont annulés pour économiser le quota ;
# la production (mise en ligne demandée) est toujours construite.
if [ "$CONTEXT" = "deploy-preview" ] || [ "$CONTEXT" = "branch-deploy" ]; then
  echo "Aperçu ignoré ($CONTEXT) : seules les mises en ligne de production sont construites."
  exit 0
fi
exit 1
