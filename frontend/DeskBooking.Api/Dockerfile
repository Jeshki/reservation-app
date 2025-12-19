FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY DeskBooking.Api.csproj ./
RUN dotnet restore "./DeskBooking.Api.csproj"
COPY . ./
RUN dotnet publish "./DeskBooking.Api.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
EXPOSE 8080
CMD ["sh", "-c", "dotnet DeskBooking.Api.dll --urls http://0.0.0.0:${PORT:-8080}"]
