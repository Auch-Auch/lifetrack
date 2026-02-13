package graph

import (
	"fmt"
	"io"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"github.com/google/uuid"
)

// MarshalUUID marshals uuid.UUID to GraphQL
func MarshalUUID(u uuid.UUID) graphql.Marshaler {
	return graphql.WriterFunc(func(w io.Writer) {
		_, _ = io.WriteString(w, `"`+u.String()+`"`)
	})
}

// UnmarshalUUID unmarshals GraphQL input to uuid.UUID
func UnmarshalUUID(v interface{}) (uuid.UUID, error) {
	str, ok := v.(string)
	if !ok {
		return uuid.Nil, fmt.Errorf("UUID must be a string")
	}
	return uuid.Parse(str)
}

// MarshalDate marshals time.Time to GraphQL Date (YYYY-MM-DD format)
func MarshalDate(t time.Time) graphql.Marshaler {
	return graphql.WriterFunc(func(w io.Writer) {
		_, _ = io.WriteString(w, `"`+t.Format("2006-01-02")+`"`)
	})
}

// UnmarshalDate unmarshals GraphQL Date input to time.Time
func UnmarshalDate(v interface{}) (time.Time, error) {
	str, ok := v.(string)
	if !ok {
		return time.Time{}, fmt.Errorf("Date must be a string")
	}
	// Parse date in UTC to match database timezone
	t, err := time.Parse("2006-01-02", str)
	if err != nil {
		return time.Time{}, err
	}
	// Convert to UTC
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC), nil
}

// MarshalTime marshals time.Time to GraphQL Time (RFC3339 format)
func MarshalTime(t time.Time) graphql.Marshaler {
	return graphql.WriterFunc(func(w io.Writer) {
		_, _ = io.WriteString(w, `"`+t.Format(time.RFC3339)+`"`)
	})
}

// UnmarshalTime unmarshals GraphQL Time input to time.Time
func UnmarshalTime(v interface{}) (time.Time, error) {
	str, ok := v.(string)
	if !ok {
		return time.Time{}, fmt.Errorf("Time must be a string")
	}
	return time.Parse(time.RFC3339, str)
}
