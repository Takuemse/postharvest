# Usage, from the server folder:  . .\scripts\dev-login.ps1
$envFile = Join-Path $PSScriptRoot "..\..\client\.env"
foreach ($line in Get-Content $envFile) {
  if ($line -match '^\s*VITE_SUPABASE_URL\s*=\s*(.+)$') { $SUPA = $Matches[1].Trim().Trim('"') }
  if ($line -match '^\s*VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*(.+)$') { $KEY = $Matches[1].Trim().Trim('"') }
}

function Login-Buyer($email, $password) {
  $r = Invoke-RestMethod -Method Post "$SUPA/auth/v1/token?grant_type=password" -Headers @{ apikey = $KEY } -ContentType "application/json" -Body (@{ email = $email; password = $password } | ConvertTo-Json)
  @{ Authorization = "Bearer $($r.access_token)" }
}
function Login-Farmer($phone, $code) {
  Invoke-RestMethod -Method Post "$SUPA/auth/v1/otp" -Headers @{ apikey = $KEY } -ContentType "application/json" -Body (@{ phone = $phone } | ConvertTo-Json) | Out-Null
  $r = Invoke-RestMethod -Method Post "$SUPA/auth/v1/verify" -Headers @{ apikey = $KEY } -ContentType "application/json" -Body (@{ type = "sms"; phone = $phone; token = $code } | ConvertTo-Json)
  @{ Authorization = "Bearer $($r.access_token)" }
}

$bh   = Login-Buyer "buyer2@test.com" "LongTestPass123"
$auth = Login-Farmer "+263770000001" "123456"
"Logged in: `$bh (buyer) and `$auth (farmer) are ready."