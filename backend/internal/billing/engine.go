package billing

import (
	"fmt"
	"math"
	"time"
)

// CalculateProRata calculates mid-month activation charges based on calendar month days
// Formula: (Package Price / Total Days in Month) * Remaining Days
func CalculateProRata(monthlyPrice float64, activationDate time.Time) float64 {
	year, month, _ := activationDate.Date()
	daysInMonth := DaysInMonth(year, month)
	remainingDays := daysInMonth - activationDate.Day() + 1
	if remainingDays <= 0 {
		remainingDays = 1
	}

	proRata := (monthlyPrice / float64(daysInMonth)) * float64(remainingDays)
	return math.Round(proRata*100) / 100
}

// DaysInMonth returns total days in a specific calendar month
func DaysInMonth(year int, month time.Month) int {
	return time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day()
}

// FormatInvoiceNumber generates standard ISP invoice code e.g. 'INV-202609-0001'
func FormatInvoiceNumber(t time.Time, sequence int) string {
	return fmt.Sprintf("INV-%s-%04d", t.Format("200601"), sequence)
}

// GetBillingCycleDates returns (periodStart, periodEnd, dueDate) for a given reference month
func GetBillingCycleDates(refTime time.Time) (time.Time, time.Time, time.Time) {
	year, month, _ := refTime.Date()
	periodStart := time.Date(year, month, 1, 0, 0, 0, 0, time.UTC)
	days := DaysInMonth(year, month)
	periodEnd := time.Date(year, month, days, 23, 59, 59, 0, time.UTC)
	
	// Standard Bangladesh ISP Due Date: 10th of the calendar month
	dueDate := time.Date(year, month, 10, 23, 59, 59, 0, time.UTC)

	return periodStart, periodEnd, dueDate
}
