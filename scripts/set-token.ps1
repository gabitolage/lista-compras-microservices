param(
    [string]$UserId = 'test-user-1'
)

# Este script deve ser dot-sourced para definir $token na sessão atual:
# . .\scripts\set-token.ps1 -UserId test-user-1

$oldPwd = Get-Location
try {
    # Mudar para o list-service para garantir que o pacote jsonwebtoken esteja disponível
    Set-Location -Path (Join-Path $PSScriptRoot 'services\list-service')

    # Tentar usar o JWT_SECRET do ambiente, senão usar o default
    $jwtSecret = $env:JWT_SECRET
    if (-not $jwtSecret) { $jwtSecret = 'user-service-secret-key-puc-minas' }

    # Executar node para gerar token
    $nodeCmd = "require('jsonwebtoken').sign({ userId: '$UserId' }, process.env.JWT_SECRET || '$jwtSecret')"
    $token = & node -e $nodeCmd

    if ($LASTEXITCODE -ne 0 -or -not $token) {
        Write-Error 'Erro ao gerar token com node. Verifique se o node está instalado e as dependências em services/list-service/node_modules.'
    } else {
        # Definir variável global na sessão atual
        Set-Variable -Name token -Value $token -Scope Global
        Write-Host "Token gerado e armazenado em `$token`"
    }
} finally {
    Set-Location -Path $oldPwd
}
