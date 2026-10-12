param(
    [switch]$Deploy,
    [string]$Python = 'C:/PNP1/pnp1/.venv/Scripts/python.exe',
    [string]$GitProxy = '',
    [ValidatePattern('^/[a-zA-Z0-9/_-]*$')][string]$SmokePath = '/solutions/'
)
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $project
$gitOptions = @('-c', "safe.directory=$project")
if ($GitProxy) { $gitOptions += @('-c', "http.proxy=$GitProxy") }
function Git-Checked([string[]]$Arguments) {
    $result = & git @gitOptions @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Git failed: $($Arguments[0])" }
    return $result
}
$env:DJANGO_ALLOWED_HOSTS = '127.0.0.1,localhost,testserver'
& $Python manage.py check
if ($LASTEXITCODE -ne 0) { throw 'Django check failed' }
$changed = @(Git-Checked @('diff', '--name-only', 'github/main'))
Git-Checked @('diff', '--check')
$frontendOnly = $changed.Count -gt 0 -and @($changed | Where-Object { $_ -notmatch '^(templates/|static/|data_import/solutions|docs/)' }).Count -eq 0
if ($frontendOnly) { & $Python manage.py test main.test_solutions --noinput }
else { & $Python manage.py test --noinput }
if ($LASTEXITCODE -ne 0) { throw 'Tests failed' }
Git-Checked @('status', '--short', '--branch')
if (-not $Deploy) {
    Write-Output 'Validation only. No push, SSH writes, or deployment. Use -Deploy only after explicit deployment approval and a reviewed commit.'
    exit 0
}
if (Git-Checked @('status', '--porcelain')) { throw 'Commit reviewed changes first; unfinished changes are not deployed.' }
if ((Git-Checked @('branch', '--show-current')) -notin @('main', 'develop')) { throw 'Release must come from main or develop.' }
if ((Git-Checked @('remote', 'get-url', 'github')) -ne 'https://github.com/Artemka2302/pnp1.git') { throw 'Unexpected GitHub destination.' }
Git-Checked @('fetch', 'github', 'main', 'develop')
foreach ($branch in @('main', 'develop')) { Git-Checked @('merge-base', '--is-ancestor', "github/$branch", 'HEAD') }
$commit = Git-Checked @('rev-parse', 'HEAD')
foreach ($branch in @('main', 'develop')) { Git-Checked @('merge-base', '--is-ancestor', $branch, $commit) }
$critical = @(Git-Checked @('diff', '--name-only', 'github/main', 'HEAD') | Where-Object { $_ -match '(^main/(migrations/|models\.py$|views\.py$|urls\.py$|bitrix\.py$|ai\.py$)|^config/|^docker/|^compose|^Dockerfile$|^requirements.txt$|^\.env)' })
if ($critical.Count) { throw "Critical changes require the full manual deployment workflow: $($critical -join ', ')" }
$key = 'C:/Users/AD/.ssh/silaopt_ed25519'
$target = 'silaopt@194.156.124.214'
$sshOptions = @('-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', '-i', $key)
& ssh @sshOptions $target 'cd /home/silaopt/pnp1-django && test -z "$(git status --porcelain)" && git status --short --branch && docker inspect pnp1-web-1 --format "{{.Config.Image}} {{.State.Health.Status}}"'
if ($LASTEXITCODE -ne 0) { throw 'Production preflight failed; nothing pushed.' }
$originalBranch = Git-Checked @('branch', '--show-current')
foreach ($branch in @('main', 'develop')) {
    Git-Checked @('switch', $branch)
    Git-Checked @('merge', '--ff-only', $commit)
}
Git-Checked @('switch', $originalBranch)
Git-Checked @('push', '--atomic', 'github', 'HEAD:main', 'HEAD:develop')
& ssh @sshOptions $target "mkdir -p /home/silaopt/pnp1-deploy/$commit"
if ($LASTEXITCODE -ne 0) { throw 'Release directory failed' }
& scp @sshOptions (Join-Path $PSScriptRoot 'release-pnp.sh') "${target}:/home/silaopt/pnp1-deploy/$commit/release.sh"
if ($LASTEXITCODE -ne 0) { throw 'Release script upload failed' }
& ssh @sshOptions $target "sh /home/silaopt/pnp1-deploy/$commit/release.sh $commit $SmokePath"
if ($LASTEXITCODE -ne 0) { throw 'Deployment failed. Inspect output and live health before retrying.' }
Write-Output "Released $commit at https://pnp1.ru$SmokePath"
