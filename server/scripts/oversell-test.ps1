# Usage, from the server folder:
#   . .\scripts\dev-login.ps1
#   . .\scripts\oversell-test.ps1
$ErrorActionPreference = "Stop"
$base = "http://localhost:4000"
$json = "application/json"

function Call-Api($path, $headers, $body = $null) {
  $req = @{ Method = "Post"; Uri = "$base$path"; Headers = $headers }
  if ($null -ne $body) { $req.ContentType = $json; $req.Body = ($body | ConvertTo-Json) }
  (Invoke-RestMethod @req).data
}
function Try-Confirm($id) {
  try { (Call-Api "/api/orders/$id/confirm" $bh).status }
  catch { "REFUSED: " + $_.ErrorDetails.Message }
}

$tomatoes = ((Invoke-RestMethod "$base/api/reference/crops").data | Where-Object { $_.name -eq "Tomatoes" }).id
$mutare   = ((Invoke-RestMethod "$base/api/reference/locations").data | Where-Object { $_.name -eq "Mutare" }).id
$today = (Get-Date).ToString("yyyy-MM-dd")
$need  = (Get-Date).AddDays(4).ToString("yyyy-MM-dd")

$h = $d1 = $d2 = $x = $y = $null
try {
  # A dedicated harvest with exactly 400 kg free, so the test does not depend on other data
  $h  = (Call-Api "/api/harvests" $auth @{ cropId = $tomatoes; harvestDate = $today; storage = "AMBIENT"; quantityKg = 400 }).id
  $d1 = (Call-Api "/api/demands" $bh @{ cropId = $tomatoes; quantityKg = 300; neededBy = $need; locationId = $mutare }).id
  $d2 = (Call-Api "/api/demands" $bh @{ cropId = $tomatoes; quantityKg = 200; neededBy = $need; locationId = $mutare }).id
  $x  = (Call-Api "/api/orders" $auth @{ harvestId = $h; demandId = $d1; quantityKg = 300 }).id
  $y  = (Call-Api "/api/orders" $auth @{ harvestId = $h; demandId = $d2; quantityKg = 200 }).id

  "Confirm X (300 kg): " + (Try-Confirm $x)
  "Confirm Y (200 kg): " + (Try-Confirm $y)
  $after = (Invoke-RestMethod "$base/api/harvests/$h" -Headers $auth).data
  "Harvest now: reserved $($after.reservedKg) kg, available $($after.availableKg) kg"
}
finally {
  foreach ($o in @($x, $y)) {
    if ($o) {
      try { Call-Api "/api/orders/$o/cancel" $bh | Out-Null }
      catch { try { Call-Api "/api/orders/$o/cancel" $auth | Out-Null } catch {} }
    }
  }
  foreach ($d in @($d1, $d2)) { if ($d) { try { Call-Api "/api/demands/$d/close" $bh | Out-Null } catch {} } }
  if ($h) { try { Call-Api "/api/harvests/$h/withdraw" $auth | Out-Null } catch {} }
  "Cleaned up."
}