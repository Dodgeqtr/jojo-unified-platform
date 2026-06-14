# fix-git-lock.ps1
# يحل مشكلة قفل git index.lock في مستودع jojo-unified-platform

$repo = "C:\Users\dodge\jojo-unified-platform"
$lock = Join-Path $repo ".git\index.lock"

if (Test-Path $lock) {
    Write-Host "تم العثور على القفل: $lock" -ForegroundColor Yellow

    # محاولة إيقاف أي عمليات git أو محررات قد تكون فاتحة على المستودع
    Get-Process git -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

    Remove-Item -Force $lock -ErrorAction Stop
    Write-Host "تم حذف القفل بنجاح ✅" -ForegroundColor Green
} else {
    Write-Host "ما فيه قفل موجود — كل شيء تمام ✅" -ForegroundColor Green
}
