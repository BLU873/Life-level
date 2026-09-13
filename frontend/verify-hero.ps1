$ErrorActionPreference = 'Stop'
$page = 'frontend/src/pages/Dashboard.jsx'
$dash = Get-Content -LiteralPath $page -Raw
Write-Output "PAGE      : $page"
Write-Output "LINES     : $((Get-Content -LiteralPath $page | Measure-Object -Line).Lines)"
Write-Output ""

# Find where AuthenticatedHero is rendered inside the component return.
$heroTok = 'AuthenticatedHero'
$idx = $dash.IndexOf($heroTok)
Write-Output ("AUTHENTICATEDHERO FIRST OCCURRENCE (raw): {0}" -f $idx)

# The hero import line (usage in JSX render).
$renderStart = $dash.IndexOf('return (')
$body = $dash.Substring($renderStart)
$renderIdx = $body.IndexOf('AuthenticatedHero')
Write-Output ("AUTHENTICATEDHERO IN RENDER (offset from `"return (`"): {0}" -f $renderIdx)

# Rendering order: find the index of each visual child within the render body.
$tokens = @(
  'AuthenticatedHero',
  'PageHeader',
  'StatCard',
  'dash-hero',
  "Today's Arc",
  'Focus',
  'Character',
  'weekly',
  'Journey',
  'Achievement',
  'Activity'
)
Write-Output ""
Write-Output "=== RENDER ORDER (0 = first) ==="
$ordered = @()
foreach ($t in $tokens) {
  $i = $body.IndexOf($t)
  $ordered += [pscustomobject]@{ Token = $t; Idx = $i }
}
$ordered | Sort-Object Idx | ForEach-Object { Write-Output ("{0,6}  {1}" -f $_.Idx, $_.Token) }

# Does the render begin with AuthenticatedHero (i.e. it is the FIRST section)?
$heroPos = $body.IndexOf('AuthenticatedHero')
$firstSection = $order[0].Token
Write-Output ""
Write-Output ("First-rendered visual token: {0}" -f ($ordered | Sort-Object Idx | Select-Object -First 1).Token)
