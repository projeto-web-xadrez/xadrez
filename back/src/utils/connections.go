package utils

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"google.golang.org/grpc"
)

func RetryPostgresConnection(postgresUrl string, delay time.Duration) *pgxpool.Pool {
	for {
		dbPool, err := pgxpool.New(context.Background(), postgresUrl)
		if err != nil {
			println(err)
			println("Error initializing postgres connection, retrying in " + delay.String() + "...")
			time.Sleep(delay)
			continue
		}
		if err = dbPool.Ping(context.TODO()); err != nil {
			println(err)
			println("Error initializing postgres connection, retrying in " + delay.String() + "...")
			time.Sleep(delay)
			continue
		}
		return dbPool
	}
}

func RetryGRPCConnection(grpcAddress string, dialOption grpc.DialOption, delay time.Duration) *grpc.ClientConn {
	for {
		client, err := grpc.NewClient(grpcAddress, dialOption)
		if err != nil {
			println(err)
			println("Error initializing GRPC connection, retrying in " + delay.String() + "...")
			time.Sleep(delay)
			continue
		}

		return client
	}
}

func RetryRedisConnection(redisAddress string, redisPassword string, delay time.Duration) *redis.Client {
	redisClient := redis.NewClient(&redis.Options{
		Addr:     redisAddress,
		Password: redisPassword,
		DB:       0,
	})

	for {
		_, err := redisClient.Ping(context.TODO()).Result()
		if err != nil {
			println(err)
			println("Error pinging redis, retring in " + delay.String() + "...")
			time.Sleep(delay)
			continue
		}
		return redisClient
	}
}
