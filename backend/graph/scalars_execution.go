package graph

import (
	"context"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"github.com/google/uuid"
	"github.com/vektah/gqlparser/v2/ast"
)

// unmarshalInputDate unmarshals Date scalar input
func (ec *executionContext) unmarshalInputDate(ctx context.Context, v interface{}) (time.Time, error) {
	return UnmarshalDate(v)
}

// _Date returns the marshaler for Date scalar
func (ec *executionContext) _Date(ctx context.Context, sel ast.SelectionSet, v *time.Time) graphql.Marshaler {
	if v == nil {
		return graphql.Null
	}
	return MarshalDate(*v)
}

// unmarshalInputTime unmarshals Time scalar input
func (ec *executionContext) unmarshalInputTime(ctx context.Context, v interface{}) (time.Time, error) {
	return UnmarshalTime(v)
}

// _Time returns the marshaler for Time scalar
func (ec *executionContext) _Time(ctx context.Context, sel ast.SelectionSet, v *time.Time) graphql.Marshaler {
	if v == nil {
		return graphql.Null
	}
	return MarshalTime(*v)
}

// unmarshalInputUUID unmarshals UUID scalar input
func (ec *executionContext) unmarshalInputUUID(ctx context.Context, v interface{}) (uuid.UUID, error) {
	return UnmarshalUUID(v)
}

// _UUID returns the marshaler for UUID scalar
func (ec *executionContext) _UUID(ctx context.Context, sel ast.SelectionSet, v *uuid.UUID) graphql.Marshaler {
	if v == nil {
		return graphql.Null
	}
	return MarshalUUID(*v)
}
