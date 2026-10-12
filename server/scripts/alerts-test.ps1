# Usage, from the server folder, as two separate steps:
#   . .\scripts\dev-login.ps1
#   . .\scripts\alerts-test.ps1
$ErrorActionPreference = "Stop"
$base = "http://localhost:4000"
$json = "application/json"

function Call-Api($method, $path, $headers, $body = $null) {
  $req = @{ Method = $method; Uri = "$base$path"; Headers = $headers }
  if ($null -ne $body) { $req.ContentType = $json; $req.Body = ($body | ConvertTo-Json) }
  (Invoke-RestMethod @req).data
}
function Count-Alerts($type, $crop) {
  @((Call-Api "Get" "/api/notifications" $auth).items |
    Where-Object { $_.type -eq $type -and $_.title -like "*$crop*" }).Count
}
function Wait-For-Increase($type, $crop, $before, $seconds) {
  for ($i = 0; $i -lt $seconds; $i += 4) {
    if ((Count-Alerts $type $crop) -gt $before) { return $true }
    Start-Sleep -Seconds 4
  }
  return $false
}

$crops  = (Invoke-RestMethod "$base/api/reference/crops").data
$tomato = ($crops | Where-Object { $_.name -eq "Tomatoes" }).id
$onion  = ($crops | Where-Object { $_.name -eq "Onions" }).id
$mutare = ((Invoke-RestMethod "$base/api/reference/locations").data | Where-Object { $_.name -eq "Mutare" }).id
$today  = (Get-Date).ToString("yyyy-MM-dd")
$old    = (Get-Date).AddDays(-16).ToString("yyyy-MM-dd")

$h1 = $h2 = $d1 = $d2 = $null
try {
  $m0 = Count-Alerts "DEMAND_MATCH" "Tomatoes"
  $r0 = Count-Alerts "HARVEST_AT_RISK" "Onions"
  $n0 = Count-Alerts "DEMAND_MATCH" "Onions"

  # Alert 1: a STRONG fit (about 90) must notify
  $h1 = (Call-Api "Post" "/api/harvests" $auth @{ cropId = $tomato; harvestDate = $today; storage = "AMBIENT"; quantityKg = 400 }).id
  $d1 = (Call-Api "Post" "/api/demands" $bh @{ cropId = $tomato; quantityKg = 217; neededBy = (Get-Date).AddDays(4).ToString("yyyy-MM-dd"); locationId = $mutare }).id
  $ok1 = Wait-For-Increase "DEMAND_MATCH" "Tomatoes" $m0 40
  "Alert 1, strong fit notifies:        " + $(if ($ok1) { "PASS" } else { "FAIL" })

  # A GOOD fit (about 72) must NOT trigger Alert 1
  $h2 = (Call-Api "Post" "/api/harvests" $auth @{ cropId = $onion; harvestDate = $old; storage = "AMBIENT"; quantityKg = 300 }).id
  $d2 = (Call-Api "Post" "/api/demands" $bh @{ cropId = $onion; quantityKg = 113; neededBy = (Get-Date).AddDays(3).ToString("yyyy-MM-dd"); locationId = $mutare }).id
  Start-Sleep -Seconds 15
  $ok2 = (Count-Alerts "DEMAND_MATCH" "Onions") -eq $n0
  "Alert 1, good fit stays silent:      " + $(if ($ok2) { "PASS" } else { "FAIL" })

  # Alert 2: the sweep must notify once
  npm run sweep | Out-Null
  $ok3 = (Count-Alerts "HARVEST_AT_RISK" "Onions") -eq ($r0 + 1)
  "Alert 2, sweep notifies once:        " + $(if ($ok3) { "PASS" } else { "FAIL" })

  npm run sweep | Out-Null
  $ok4 = (Count-Alerts "HARVEST_AT_RISK" "Onions") -eq ($r0 + 1)
  "Alert 2, second sweep no duplicate:  " + $(if ($ok4) { "PASS" } else { "FAIL" })
}
finally {
  foreach ($d in @($d1, $d2)) { if ($d) { try { Call-Api "Post" "/api/demands/$d/close" $bh | Out-Null } catch {} } }
  foreach ($h in @($h1, $h2)) { if ($h) { try { Call-Api "Post" "/api/harvests/$h/withdraw" $auth | Out-Null } catch {} } }
  "Cleaned up."
}