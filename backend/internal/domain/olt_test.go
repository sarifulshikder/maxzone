package domain

import "testing"

func TestEvaluateOpticalHealth(t *testing.T) {
	cases := []struct {
		name string
		rx   *float64
		want string
	}{
		{"nil reading is unknown", nil, HealthUnknown},
		{"overloaded strong signal warns", f(-6.2), HealthWarning},
		{"strong but acceptable edge", f(-8.0), HealthOptimal},
		{"optimal mid-band", f(-18.9), HealthOptimal},
		{"optimal boundary", f(-23.9), HealthOptimal},
		{"warning band edge generous", f(-24.0), HealthOptimal},
		{"warning mid-band", f(-25.1), HealthWarning},
		{"warning band lower", f(-26.9), HealthWarning},
		{"critical at sensitivity edge generous", f(-27.0), HealthWarning},
		{"critical deep signal loss", f(-30.0), HealthCritical},
		{"critical extreme", f(-35.5), HealthCritical},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := EvaluateOpticalHealth(tc.rx); got != tc.want {
				t.Errorf("EvaluateOpticalHealth(%v) = %q, want %q", tc.rx, got, tc.want)
			}
		})
	}
}

func TestPONPortName(t *testing.T) {
	if got := PONPortName(0, 1, 1); got != "PON 0/1/1" {
		t.Errorf("PONPortName(0,1,1) = %q, want %q", got, "PON 0/1/1")
	}
	if got := PONPortName(1, 4, 6); got != "PON 1/4/6" {
		t.Errorf("PONPortName(1,4,6) = %q, want %q", got, "PON 1/4/6")
	}
}

func f(v float64) *float64 {
	return &v
}