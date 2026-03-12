

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Admin Password Change Test Script" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:3000"
$endpoint = "/api/admin/change-password"

# Prompt for admin token
Write-Host "Step 1: Get your admin token" -ForegroundColor Yellow
Write-Host "You can find this in:" -ForegroundColor Gray
Write-Host "  - Browser DevTools > Application > Cookies > adminToken" -ForegroundColor Gray
Write-Host "  - Or from your login response" -ForegroundColor Gray
Write-Host ""
$token = Read-Host "Enter your admin JWT token"

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "Error: Token is required!" -ForegroundColor Red
    exit 1
}

# Prompt for passwords
Write-Host ""
Write-Host "Step 2: Enter passwords" -ForegroundColor Yellow
$currentPassword = Read-Host "Enter your current password" -AsSecureString
$currentPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($currentPassword)
)

$newPassword = Read-Host "Enter your new password" -AsSecureString
$newPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($newPassword)
)

# Prepare request
Write-Host ""
Write-Host "Step 3: Sending request..." -ForegroundColor Yellow

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

$body = @{
    currentPassword = $currentPasswordPlain
    newPassword = $newPasswordPlain
} | ConvertTo-Json

try {
    # Make the request
    $response = Invoke-RestMethod -Uri "$baseUrl$endpoint" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop

    # Success
    Write-Host ""
    Write-Host "✓ SUCCESS!" -ForegroundColor Green
    Write-Host "Password changed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10 | Write-Host

} catch {
    # Error handling
    Write-Host ""
    Write-Host "✗ ERROR!" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $statusDescription = $_.Exception.Response.StatusDescription
        
        Write-Host "Status Code: $statusCode - $statusDescription" -ForegroundColor Red
        
        # Try to get error details
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd() | ConvertFrom-Json
            
            Write-Host ""
            Write-Host "Error Details:" -ForegroundColor Yellow
            $errorBody | ConvertTo-Json -Depth 10 | Write-Host
            
            Write-Host ""
            Write-Host "Troubleshooting:" -ForegroundColor Cyan
            
            switch ($statusCode) {
                400 {
                    if ($errorBody.message -like "*required*") {
                        Write-Host "  - Make sure both current and new passwords are provided" -ForegroundColor Gray
                    } elseif ($errorBody.message -like "*incorrect*") {
                        Write-Host "  - Your current password is wrong. Please try again." -ForegroundColor Gray
                    }
                }
                401 {
                    Write-Host "  - Your admin token is invalid or expired" -ForegroundColor Gray
                    Write-Host "  - Try logging in again to get a fresh token" -ForegroundColor Gray
                }
                404 {
                    Write-Host "  - Admin account not found in database" -ForegroundColor Gray
                    Write-Host "  - Contact a super admin to verify your account" -ForegroundColor Gray
                }
                500 {
                    Write-Host "  - Server error occurred" -ForegroundColor Gray
                    Write-Host "  - Check the server console for error details" -ForegroundColor Gray
                }
            }
        } catch {
            Write-Host "Could not parse error response" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Possible causes:" -ForegroundColor Cyan
        Write-Host "  - Server is not running on $baseUrl" -ForegroundColor Gray
        Write-Host "  - Network connection issue" -ForegroundColor Gray
        Write-Host "  - Firewall blocking the request" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Test Complete" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Clean up sensitive data
$currentPasswordPlain = $null
$newPasswordPlain = $null
